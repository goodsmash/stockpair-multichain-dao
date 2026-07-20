import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getAddress, parseAbi, zeroAddress } from 'viem'

const root = path.resolve(fileURLToPath(new URL('../../../..', import.meta.url)))
const poolArtifact = JSON.parse(fs.readFileSync(path.join(root, 'artifacts', 'solc', 'StockCoinPool.json'), 'utf8'))
const poolAbi = poolArtifact.abi
const launchpadEvents = parseAbi([
  'event PairLaunched(uint256 indexed launchId,address indexed creator,address indexed pool,address coinToken,address stockToken,uint256 coinAmount,uint256 stockAmount,uint256 liquidity,uint64 liquidityUnlockAt,uint256 liquidityLockId,uint256 creatorVestingId,uint16 feeBps,bytes32 metadataHash)',
  'event PauseStatusChanged(bool paused,address indexed caller)',
  'event StockEmergencyStatusChanged(address indexed stockToken,bool blocked,address indexed caller)',
  'event PoolEmergencyStatusChanged(address indexed pool,bool blocked,address indexed caller)',
  'event OwnershipTransferStarted(address indexed currentOwner,address indexed pendingOwner,uint64 expiresAt)',
  'event OwnershipTransferCanceled(address indexed currentOwner,address indexed canceledOwner)',
  'event OwnershipTransferred(address indexed previousOwner,address indexed newOwner)'
])
const poolEvents = parseAbi([
  'event Swap(address indexed sender,address indexed recipient,address indexed tokenIn,uint256 amountIn,uint256 amountOut)',
  'event LiquidityRemoved(address indexed provider,address indexed recipient,uint256 coinAmount,uint256 stockAmount,uint256 liquidity)'
])

function idFor(chainId, log) { return `protocol:${chainId}:${log.transactionHash}:${Number(log.logIndex ?? 0)}` }
function base(config, log, kind) {
  return {
    id: idFor(config.chainId, log), kind, at: new Date().toISOString(), chainId: config.chainId,
    chain: config.network, address: getAddress(log.address), transactionHash: log.transactionHash,
    blockNumber: log.blockNumber.toString(), logIndex: Number(log.logIndex ?? 0), source: 'verified-stockpair-protocol'
  }
}

export function createProtocolAlertMonitor({ indexer, config, onEvent }) {
  let lastBlock = null
  let timer = null
  let running = false
  let lastError = null
  let emitted = 0
  let pools = []
  let poolsRefreshedAt = 0

  async function refreshPools(force = false) {
    if (!force && Date.now() - poolsRefreshedAt < 60_000) return pools
    const launches = await indexer.launches(100).catch(() => [])
    pools = launches.map((item) => item.pool).filter((item) => item && item !== zeroAddress)
    poolsRefreshedAt = Date.now()
    return pools
  }

  async function largeSwapEvent(log) {
    const amountIn = BigInt(log.args.amountIn ?? 0)
    if (amountIn <= 0n) return null
    const [coin, stock, state] = await Promise.all([
      indexer.client.readContract({ address: log.address, abi: poolAbi, functionName: 'coinToken' }),
      indexer.client.readContract({ address: log.address, abi: poolAbi, functionName: 'stockToken' }),
      indexer.client.readContract({ address: log.address, abi: poolAbi, functionName: 'getPoolState' })
    ]).catch(() => [null, null, null])
    if (!coin || !stock || !state) return null
    const tokenIn = getAddress(log.args.tokenIn)
    const reserveAfter = tokenIn.toLowerCase() === coin.toLowerCase() ? state[0] : tokenIn.toLowerCase() === stock.toLowerCase() ? state[1] : 0n
    const reserveBefore = reserveAfter > amountIn ? reserveAfter - amountIn : reserveAfter
    if (reserveBefore <= 0n) return null
    const reserveShareBps = Number((amountIn * 10_000n) / reserveBefore)
    if (reserveShareBps < config.alertLargeSwapBps) return null
    return {
      ...base(config, log, 'large-swap'), pool: getAddress(log.address), sender: getAddress(log.args.sender),
      recipient: getAddress(log.args.recipient), tokenIn, amountIn: amountIn.toString(), amountOut: String(log.args.amountOut ?? 0),
      reserveShareBps, thresholdBps: config.alertLargeSwapBps
    }
  }

  async function processLaunchpad(log) {
    const common = base(config, log, 'emergency-change')
    switch (log.eventName) {
      case 'PairLaunched':
        await refreshPools(true)
        return { ...common, kind: 'pool-created', pool: getAddress(log.args.pool), deployer: getAddress(log.args.creator), token0: getAddress(log.args.coinToken), token1: getAddress(log.args.stockToken), launchId: String(log.args.launchId) }
      case 'OwnershipTransferStarted':
        return { ...common, kind: 'ownership-changed', action: 'transfer-started', actor: getAddress(log.args.currentOwner), newOwner: getAddress(log.args.pendingOwner), expiresAt: Number(log.args.expiresAt) }
      case 'OwnershipTransferCanceled':
        return { ...common, kind: 'ownership-changed', action: 'transfer-canceled', actor: getAddress(log.args.currentOwner), newOwner: getAddress(log.args.canceledOwner) }
      case 'OwnershipTransferred':
        return { ...common, kind: 'ownership-changed', action: 'transfer-completed', actor: getAddress(log.args.previousOwner), newOwner: getAddress(log.args.newOwner) }
      case 'PauseStatusChanged':
        return { ...common, action: log.args.paused ? 'protocol-paused' : 'protocol-unpaused', actor: getAddress(log.args.caller), blocked: Boolean(log.args.paused) }
      case 'StockEmergencyStatusChanged':
        return { ...common, action: 'stock-emergency', actor: getAddress(log.args.caller), token: { address: getAddress(log.args.stockToken) }, blocked: Boolean(log.args.blocked) }
      case 'PoolEmergencyStatusChanged':
        return { ...common, action: 'pool-emergency', actor: getAddress(log.args.caller), pool: getAddress(log.args.pool), blocked: Boolean(log.args.blocked) }
      default: return null
    }
  }

  async function processPool(log) {
    if (log.eventName === 'LiquidityRemoved') {
      return {
        ...base(config, log, 'liquidity-removed'), pool: getAddress(log.address), provider: getAddress(log.args.provider),
        recipient: getAddress(log.args.recipient), coinAmount: String(log.args.coinAmount), stockAmount: String(log.args.stockAmount), liquidity: String(log.args.liquidity)
      }
    }
    if (log.eventName === 'Swap') return largeSwapEvent(log)
    return null
  }

  async function poll() {
    if (running || !config.protocolAlertsEnabled || config.launchpadAddress === zeroAddress) return
    running = true
    try {
      const head = await indexer.client.getBlockNumber()
      if (lastBlock === null) { lastBlock = head; await refreshPools(true); return }
      if (head <= lastBlock) return
      const fromBlock = head - lastBlock > BigInt(config.alertMaxBlocksPerPoll) ? head - BigInt(config.alertMaxBlocksPerPoll - 1) : lastBlock + 1n
      const knownPools = await refreshPools()
      const [launchpadLogs, poolLogs] = await Promise.all([
        indexer.client.getLogs({ address: config.launchpadAddress, events: launchpadEvents, fromBlock, toBlock: head }).catch(() => []),
        knownPools.length ? indexer.client.getLogs({ address: knownPools, events: poolEvents, fromBlock, toBlock: head }).catch(() => []) : []
      ])
      const events = []
      for (const log of launchpadLogs) { const event = await processLaunchpad(log); if (event) events.push(event) }
      for (const log of poolLogs) { const event = await processPool(log); if (event) events.push(event) }
      events.sort((a, b) => Number(BigInt(a.blockNumber) - BigInt(b.blockNumber)) || a.logIndex - b.logIndex)
      for (const event of events) { onEvent(event); emitted += 1 }
      lastBlock = head
      lastError = null
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    } finally { running = false }
  }

  return {
    start() {
      if (!config.protocolAlertsEnabled || timer) return
      void poll()
      timer = setInterval(() => void poll(), config.alertProtocolPollIntervalMs)
      timer.unref?.()
    },
    stop() { if (timer) clearInterval(timer); timer = null },
    poll,
    status: () => ({ enabled: config.protocolAlertsEnabled, running, lastBlock: lastBlock?.toString() ?? null, pools: pools.length, emitted, lastError, largeSwapThresholdBps: config.alertLargeSwapBps })
  }
}
