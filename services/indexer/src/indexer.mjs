import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createPublicClient,
  formatUnits,
  getAddress,
  http,
  isAddress,
  keccak256,
  parseAbi,
  zeroAddress
} from 'viem'
import { scanToken as scanTokenLive } from './risk.mjs'
import { publicEndpointMetadata } from './security/public-endpoint.mjs'

const root = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)))
const artifact = (name) => JSON.parse(fs.readFileSync(path.join(root, 'artifacts', 'solc', `${name}.json`), 'utf8'))
const launchpadAbi = artifact('StockCoinLaunchpad').abi
const poolAbi = artifact('StockCoinPool').abi
const tokenAbi = artifact('LaunchToken').abi

const EVENT_ABI = parseAbi([
  'event PairLaunched(uint256 indexed launchId,address indexed creator,address indexed pool,address coinToken,address stockToken,uint256 coinAmount,uint256 stockAmount,uint256 liquidity,uint64 liquidityUnlockAt,uint256 liquidityLockId,uint256 creatorVestingId,uint16 feeBps,bytes32 metadataHash)',
  'event PauseStatusChanged(bool paused,address indexed caller)',
  'event StockEmergencyStatusChanged(address indexed stockToken,bool blocked,address indexed caller)',
  'event PoolEmergencyStatusChanged(address indexed pool,bool blocked,address indexed caller)',
  'event Swap(address indexed sender,address indexed recipient,address indexed tokenIn,uint256 amountIn,uint256 amountOut)',
  'event LiquidityAdded(address indexed provider,address indexed recipient,uint256 coinAmount,uint256 stockAmount,uint256 liquidity)',
  'event LiquidityRemoved(address indexed provider,address indexed recipient,uint256 coinAmount,uint256 stockAmount,uint256 liquidity)'
])

function asString(value) {
  return typeof value === 'bigint' ? value.toString() : value
}

async function safeRead(client, request, fallback = null) {
  try { return await client.readContract(request) } catch { return fallback }
}

export function createIndexer(config) {
  const client = createPublicClient({ chain: config.chain, transport: http(config.rpcUrl, { timeout: 10_000 }) })
  const configured = config.launchpadAddress !== zeroAddress
  const scanCache = new Map()
  const maxScanCacheEntries = 2_000

  async function scanCached(token, ttlMs = 60_000) {
    const key = token.toLowerCase()
    const current = scanCache.get(key)
    if (current && current.expires > Date.now()) return current.value
    const scanned = await scanTokenLive({
      rpcUrl: config.rpcUrl, explorerUrl: config.explorerUrl, chain: config.chain, token,
      launchpadAddress: configured ? config.launchpadAddress : undefined,
      requireExplorerVerification: config.requireExplorerVerification
    })
    const trust = await factoryTrust()
    const value = {
      ...scanned,
      protocolEligible: scanned.tradeAllowed,
      tradeAllowed: Boolean(scanned.tradeAllowed && config.productionTradingEnabled && trust.trusted),
      executionGate: config.productionTradingEnabled ? 'enabled' : 'disabled'
    }
    if (scanCache.size >= maxScanCacheEntries) {
      const now = Date.now()
      for (const [cachedKey, cachedValue] of scanCache) if (cachedValue.expires <= now) scanCache.delete(cachedKey)
      while (scanCache.size >= maxScanCacheEntries) scanCache.delete(scanCache.keys().next().value)
    }
    scanCache.set(key, { expires: Date.now() + ttlMs, value })
    return value
  }

  async function factoryTrust() {
    if (!configured) return { configured: false, trusted: false, reason: 'Launchpad is not configured', actualCodeHash: null, protocolVersion: null }
    const bytecode = await client.getBytecode({ address: config.launchpadAddress }).catch(() => undefined)
    const actualCodeHash = bytecode ? keccak256(bytecode) : null
    const protocolVersion = await safeRead(client, { address: config.launchpadAddress, abi: launchpadAbi, functionName: 'PROTOCOL_VERSION' })
    const expectedHashSet = config.launchpadCodeHash !== `0x${'0'.repeat(64)}`
    const expectedVersionSet = config.protocolVersion !== `0x${'0'.repeat(64)}`
    const codeHashMatches = Boolean(expectedHashSet && actualCodeHash && actualCodeHash.toLowerCase() === config.launchpadCodeHash.toLowerCase())
    const versionMatches = Boolean(expectedVersionSet && protocolVersion && protocolVersion.toLowerCase() === config.protocolVersion.toLowerCase())
    return { configured: true, trusted: codeHashMatches && versionMatches, actualCodeHash, expectedCodeHash: config.launchpadCodeHash, protocolVersion, expectedProtocolVersion: config.protocolVersion, codeHashMatches, versionMatches, reason: !codeHashMatches ? 'Launchpad bytecode hash does not match the deployment trust anchor' : !versionMatches ? 'Launchpad protocol version does not match the deployment trust anchor' : null }
  }

  async function network() {
    const [blockNumber, chainId, gasPrice, trust] = await Promise.all([
      client.getBlockNumber(),
      client.getChainId(),
      client.getGasPrice().catch(() => 0n),
      factoryTrust()
    ])
    return {
      chainId,
      network: config.network,
      blockNumber: blockNumber.toString(),
      gasPriceWei: gasPrice.toString(),
      rpcEndpoint: publicEndpointMetadata(config.rpcUrl),
      explorerUrl: config.explorerUrl,
      configured,
      productionTradingEnabled: config.productionTradingEnabled,
      requireExplorerVerification: config.requireExplorerVerification,
      factoryTrust: trust
    }
  }

  async function launchpadState() {
    if (!configured) return { configured: false, paused: null, launchCount: '0', stockCount: '0' }
    const [paused, launchCount, stockCount, guardian, owner, complianceEnforced, eligibilityGate, liquidityLocker] = await Promise.all([
      safeRead(client, { address: config.launchpadAddress, abi: launchpadAbi, functionName: 'paused' }),
      safeRead(client, { address: config.launchpadAddress, abi: launchpadAbi, functionName: 'launchCount' }, 0n),
      safeRead(client, { address: config.launchpadAddress, abi: launchpadAbi, functionName: 'stockCount' }, 0n),
      safeRead(client, { address: config.launchpadAddress, abi: launchpadAbi, functionName: 'guardian' }),
      safeRead(client, { address: config.launchpadAddress, abi: launchpadAbi, functionName: 'owner' }),
      safeRead(client, { address: config.launchpadAddress, abi: launchpadAbi, functionName: 'complianceEnforced' }),
      safeRead(client, { address: config.launchpadAddress, abi: launchpadAbi, functionName: 'eligibilityGate' }),
      safeRead(client, { address: config.launchpadAddress, abi: launchpadAbi, functionName: 'liquidityLocker' })
    ])
    return {
      configured: true,
      address: config.launchpadAddress,
      paused,
      launchCount: asString(launchCount),
      stockCount: asString(stockCount),
      guardian,
      owner,
      complianceEnforced,
      eligibilityGate,
      liquidityLocker
    }
  }

  async function stocks() {
    if (!configured) return []
    const count = await client.readContract({ address: config.launchpadAddress, abi: launchpadAbi, functionName: 'stockCount' })
    const output = []
    for (let i = 0n; i < count; i += 1n) {
      const [token, stockConfig] = await client.readContract({ address: config.launchpadAddress, abi: launchpadAbi, functionName: 'stockAt', args: [i] })
      const [name, symbol, decimals, price] = await Promise.all([
        safeRead(client, { address: token, abi: tokenAbi, functionName: 'name' }),
        safeRead(client, { address: token, abi: tokenAbi, functionName: 'symbol' }),
        safeRead(client, { address: token, abi: tokenAbi, functionName: 'decimals' }),
        safeRead(client, { address: config.launchpadAddress, abi: launchpadAbi, functionName: 'latestStockPrice', args: [token] })
      ])
      output.push({
        token,
        name,
        symbol,
        decimals: decimals === null ? null : Number(decimals),
        enabled: stockConfig.enabled,
        requireFreshOracleForSwaps: stockConfig.requireFreshOracleForSwaps,
        emergencyBlocked: stockConfig.emergencyBlocked,
        priceFeed: stockConfig.priceFeed,
        maxOracleAge: Number(stockConfig.maxOracleAge),
        ticker: stockConfig.ticker,
        feedDecimals: Number(stockConfig.feedDecimals),
        approvedCodeHash: stockConfig.approvedCodeHash,
        minInitialStockValueUsd18: stockConfig.minInitialStockValueUsd18.toString(),
        oracle: price ? { answer: price[0].toString(), decimals: Number(price[1]), updatedAt: price[2].toString(), fresh: price[3] } : null
      })
    }
    return output
  }

  async function launches(limit = 40) {
    if (!configured) return []
    const count = await client.readContract({ address: config.launchpadAddress, abi: launchpadAbi, functionName: 'launchCount' })
    const requested = BigInt(Math.max(1, Math.min(100, limit)))
    const start = count > requested ? count - requested : 0n
    const rows = []
    for (let index = count; index > start; index -= 1n) {
      const launchId = index - 1n
      const record = await client.readContract({ address: config.launchpadAddress, abi: launchpadAbi, functionName: 'launchAt', args: [launchId] })
      const pool = getAddress(record.pool)
      const coin = getAddress(record.coinToken)
      const stock = getAddress(record.stockToken)
      const [poolState, coinName, coinSymbol, coinSupply, stockName, stockSymbol, stockConfig, poolBlocked] = await Promise.all([
        safeRead(client, { address: pool, abi: poolAbi, functionName: 'getPoolState' }),
        safeRead(client, { address: coin, abi: tokenAbi, functionName: 'name' }),
        safeRead(client, { address: coin, abi: tokenAbi, functionName: 'symbol' }),
        safeRead(client, { address: coin, abi: tokenAbi, functionName: 'totalSupply' }),
        safeRead(client, { address: stock, abi: tokenAbi, functionName: 'name' }),
        safeRead(client, { address: stock, abi: tokenAbi, functionName: 'symbol' }),
        safeRead(client, { address: config.launchpadAddress, abi: launchpadAbi, functionName: 'stockConfigs', args: [stock] }),
        safeRead(client, { address: config.launchpadAddress, abi: launchpadAbi, functionName: 'poolEmergencyBlocked', args: [pool] }, false)
      ])
      const runtimeCode = await client.getBytecode({ address: stock }).catch(() => undefined)
      const runtimeHash = runtimeCode ? keccak256(runtimeCode) : null
      const codeMatches = Boolean(stockConfig && runtimeHash && runtimeHash.toLowerCase() === stockConfig[7].toLowerCase())
      const trust = await factoryTrust()
      const tradeAllowed = Boolean(config.productionTradingEnabled && trust.trusted && stockConfig?.[0] && !stockConfig?.[2] && !poolBlocked && codeMatches)
      rows.push({
        launchId: launchId.toString(),
        creator: record.creator,
        coinToken: coin,
        stockToken: stock,
        pool,
        createdAt: Number(record.createdAt),
        liquidityUnlockAt: Number(record.liquidityUnlockAt),
        feeBps: Number(record.feeBps),
        liquidityLockId: record.liquidityLockId.toString(),
        creatorVestingId: record.creatorVestingId.toString(),
        metadataHash: record.metadataHash,
        coin: { name: coinName, symbol: coinSymbol, totalSupply: coinSupply?.toString() ?? null },
        stock: { name: stockName, symbol: stockSymbol },
        state: poolState ? {
          reserveCoin: poolState[0].toString(),
          reserveStock: poolState[1].toString(),
          lastUpdated: Number(poolState[2]),
          lpSupply: poolState[3].toString(),
          swaps: poolState[4].toString(),
          cumulativeCoinVolume: poolState[5].toString(),
          cumulativeStockVolume: poolState[6].toString(),
          spotCoinPerStock: poolState[1] > 0n ? formatUnits(poolState[0] * 10n ** 18n / poolState[1], 18) : null
        } : null,
        security: {
          stockEnabled: stockConfig?.[0] ?? false,
          stockEmergencyBlocked: stockConfig?.[2] ?? false,
          poolEmergencyBlocked: poolBlocked,
          codeMatches,
          liquidityLocked: Number(record.liquidityUnlockAt) > Math.floor(Date.now() / 1000),
          tradeAllowed,
          reason: !config.productionTradingEnabled ? 'Production trading gate is disabled' : !trust.trusted ? trust.reason : !stockConfig?.[0] ? 'Stock is not enabled' : poolBlocked ? 'Pool is emergency blocked' : !codeMatches ? 'Stock runtime code hash mismatch' : null
        }
      })
    }
    const uniqueStocks = [...new Set(rows.map((row) => row.stockToken.toLowerCase()))]
    const scans = new Map()
    await Promise.all(uniqueStocks.map(async (token) => {
      try { scans.set(token, await scanCached(token)) } catch { scans.set(token, null) }
    }))
    for (const row of rows) {
      const scan = scans.get(row.stockToken.toLowerCase())
      const scannerPass = Boolean(scan?.tradeAllowed)
      row.security.tradeAllowed = Boolean(row.security.tradeAllowed && scannerPass)
      if (!scannerPass && !row.security.reason) row.security.reason = scan ? `Scanner verdict: ${scan.status}` : 'Scanner unavailable; fail-closed'
      row.security.scannerStatus = scan?.status ?? 'UNAVAILABLE'
      row.security.scannerScore = scan?.score ?? null
    }
    return rows
  }

  async function activity(blocks = config.eventLookbackBlocks) {
    if (!configured) return []
    const latest = await client.getBlockNumber()
    const fromBlock = latest > BigInt(blocks) ? latest - BigInt(blocks) : 0n
    const launchRows = await launches(100)
    const pools = launchRows.map((item) => item.pool)
    const [protocolLogs, poolLogs] = await Promise.all([
      client.getLogs({ address: config.launchpadAddress, events: EVENT_ABI.slice(0, 4), fromBlock, toBlock: 'latest' }).catch(() => []),
      pools.length ? client.getLogs({ address: pools, events: EVENT_ABI.slice(4), fromBlock, toBlock: 'latest' }).catch(() => []) : []
    ])
    return [...protocolLogs, ...poolLogs]
      .sort((a, b) => Number(b.blockNumber - a.blockNumber) || Number((b.logIndex ?? 0) - (a.logIndex ?? 0)))
      .slice(0, 100)
      .map((log) => ({
        event: log.eventName,
        address: log.address,
        blockNumber: log.blockNumber.toString(),
        transactionHash: log.transactionHash,
        args: Object.fromEntries(Object.entries(log.args ?? {}).map(([key, value]) => [key, asString(value)]))
      }))
  }

  async function portfolio(address) {
    if (!isAddress(address)) throw new Error('Invalid wallet address')
    const wallet = getAddress(address)
    const launchRows = await launches(100)
    const entries = []
    for (const row of launchRows) {
      const [coinBalance, stockBalance, lpBalance] = await Promise.all([
        safeRead(client, { address: row.coinToken, abi: tokenAbi, functionName: 'balanceOf', args: [wallet] }, 0n),
        safeRead(client, { address: row.stockToken, abi: tokenAbi, functionName: 'balanceOf', args: [wallet] }, 0n),
        safeRead(client, { address: row.pool, abi: poolAbi, functionName: 'balanceOf', args: [wallet] }, 0n)
      ])
      if (coinBalance > 0n || stockBalance > 0n || lpBalance > 0n) {
        entries.push({ ...row, balances: { coin: coinBalance.toString(), stock: stockBalance.toString(), lp: lpBalance.toString() } })
      }
    }
    return { address: wallet, positions: entries }
  }

  return {
    client,
    factoryTrust,
    network,
    launchpadState,
    stocks,
    launches,
    activity,
    portfolio,
    scanToken: (token) => scanCached(token, 30_000)
  }
}
