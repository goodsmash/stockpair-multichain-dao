import fs from 'node:fs'
import path from 'node:path'
import { EventEmitter } from 'node:events'
import {
  createPublicClient,
  decodeEventLog,
  defineChain,
  fallback,
  getAddress,
  http,
  isAddress,
  keccak256,
  parseAbi,
  parseAbiItem,
  toBytes,
  webSocket
} from 'viem'
import { publicEndpointLabel } from './security/public-endpoint.mjs'
import { analyzeBytecode } from './risk.mjs'
import { analyzeDaoBytecode, assessDaoDormancy, probeDaoContract } from './intelligence/dao-intelligence.mjs'

const ERC20_PROBE_ABI = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function owner() view returns (address)',
  'function paused() view returns (bool)'
])

const V2_PAIR_ABI = parseAbi([
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function getReserves() view returns (uint112 reserve0,uint112 reserve1,uint32 blockTimestampLast)',
  'function totalSupply() view returns (uint256)'
])

const V3_POOL_ABI = parseAbi([
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function fee() view returns (uint24)',
  'function liquidity() view returns (uint128)',
  'function slot0() view returns (uint160 sqrtPriceX96,int24 tick,uint16 observationIndex,uint16 observationCardinality,uint16 observationCardinalityNext,uint8 feeProtocol,bool unlocked)'
])

const PAIR_CREATED_V2 = parseAbiItem('event PairCreated(address indexed token0,address indexed token1,address pair,uint256)')
const POOL_CREATED_V3 = parseAbiItem('event PoolCreated(address indexed token0,address indexed token1,uint24 indexed fee,int24 tickSpacing,address pool)')
const SWAP_V2 = parseAbiItem('event Swap(address indexed sender,uint256 amount0In,uint256 amount1In,uint256 amount0Out,uint256 amount1Out,address indexed to)')
const SWAP_V3 = parseAbiItem('event Swap(address indexed sender,address indexed recipient,int256 amount0,int256 amount1,uint160 sqrtPriceX96,uint128 liquidity,int24 tick)')
const SCOUT_POOL_EVENTS = [PAIR_CREATED_V2, POOL_CREATED_V3]
const SCOUT_SWAP_EVENTS = [SWAP_V2, SWAP_V3]
const EIP1967_IMPLEMENTATION_SLOT = slotFor('eip1967.proxy.implementation')
const EIP1967_ADMIN_SLOT = slotFor('eip1967.proxy.admin')
const EIP1967_BEACON_SLOT = slotFor('eip1967.proxy.beacon')

const TOPICS = {
  pairV2: keccak256(Buffer.from('PairCreated(address,address,address,uint256)')),
  poolV3: keccak256(Buffer.from('PoolCreated(address,address,uint24,int24,address)')),
  swapV2: keccak256(Buffer.from('Swap(address,uint256,uint256,uint256,uint256,address)')),
  swapV3: keccak256(Buffer.from('Swap(address,address,int256,int256,uint160,uint128,int24)'))
}

function slotFor(label) {
  const value = BigInt(keccak256(toBytes(label))) - 1n
  return `0x${value.toString(16).padStart(64, '0')}`
}

function asNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : fallback
}

function riskStatus(score) {
  if (score >= 90) return 'BLOCKED'
  if (score >= 65) return 'DANGER'
  if (score >= 30) return 'CAUTION'
  return 'LOW'
}

function boundedPush(list, value, max) {
  list.unshift(value)
  if (list.length > max) list.length = max
}

async function mapLimit(items, concurrency, mapper) {
  if (!items.length) return []
  const output = new Array(items.length)
  let cursor = 0
  async function worker() {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      output[index] = await mapper(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(Math.max(1, concurrency), items.length) }, () => worker()))
  return output
}

function chunk(items, size) {
  const output = []
  for (let index = 0; index < items.length; index += size) output.push(items.slice(index, index + size))
  return output
}

function safeJsonFile(filename, fallback) {
  try {
    if (!filename || !fs.existsSync(filename)) return fallback
    return JSON.parse(fs.readFileSync(filename, 'utf8'))
  } catch (error) {
    console.error(`Failed to read ${filename}:`, error instanceof Error ? error.message : error)
    return fallback
  }
}

function normalizeAddress(value) {
  try { return isAddress(value) ? getAddress(value) : null } catch { return null }
}

function sanitizeText(value, max = 120) {
  if (typeof value !== 'string') return null
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, '').trim()
  return cleaned ? cleaned.slice(0, max) : null
}

function numericString(value, fallback = '0') {
  const text = String(value ?? '')
  return /^\d{1,100}$/.test(text) ? text : fallback
}

function publicRpcLabel(urls) {
  const values = Array.isArray(urls) ? urls : [urls]
  return values.filter(Boolean).map((url) => publicEndpointLabel(url)).join(' + failover ') || 'unconfigured'
}

function parseLabels(filename) {
  const source = safeJsonFile(filename, { entities: [] })
  const entities = []
  const addressIndex = new Map()
  for (const entity of Array.isArray(source.entities) ? source.entities : []) {
    if (!entity || typeof entity !== 'object') continue
    const normalized = {
      id: sanitizeText(entity.id, 80) ?? `entity-${entities.length + 1}`,
      name: sanitizeText(entity.name, 100) ?? 'Publicly labeled entity',
      kind: sanitizeText(entity.kind, 40) ?? 'project',
      website: sanitizeText(entity.website, 300),
      sources: Array.isArray(entity.sources) ? entity.sources.filter((item) => typeof item === 'string').slice(0, 10) : [],
      addresses: []
    }
    for (const item of Array.isArray(entity.addresses) ? entity.addresses : []) {
      const address = normalizeAddress(item?.address)
      const chainId = asNumber(item?.chainId)
      if (!address || !chainId) continue
      const evidence = {
        chainId,
        address,
        role: sanitizeText(item.role, 80) ?? 'publicly labeled address',
        source: sanitizeText(item.source, 300),
        confidence: ['verified', 'high', 'medium', 'low'].includes(item.confidence) ? item.confidence : 'medium'
      }
      normalized.addresses.push(evidence)
      addressIndex.set(`${chainId}:${address.toLowerCase()}`, { entity: normalized, evidence })
    }
    entities.push(normalized)
  }
  return { entities, addressIndex }
}

function parseWatchWallets(raw = []) {
  const output = new Map()
  for (const item of Array.isArray(raw) ? raw : []) {
    const address = normalizeAddress(item?.address)
    const chainId = asNumber(item?.chainId)
    if (!address || !chainId) continue
    output.set(`${chainId}:${address.toLowerCase()}`, {
      chainId,
      address,
      label: sanitizeText(item.label, 100) ?? 'Tracked public wallet',
      category: sanitizeText(item.category, 40) ?? 'watchlist',
      source: sanitizeText(item.source, 300),
      confidence: ['verified', 'high', 'medium', 'low'].includes(item.confidence) ? item.confidence : 'medium'
    })
  }
  return output
}

function chainFromRecord(record) {
  const rpcUrls = Array.isArray(record.rpcUrls) && record.rpcUrls.length ? record.rpcUrls : [record.rpcUrl]
  return defineChain({
    id: record.chainId,
    name: record.name,
    nativeCurrency: { name: record.nativeCurrencyName ?? 'Ether', symbol: record.nativeCurrencySymbol ?? 'ETH', decimals: 18 },
    rpcUrls: { default: { http: rpcUrls } },
    blockExplorers: record.explorerUrl ? { default: { name: `${record.name} Explorer`, url: record.explorerUrl } } : undefined
  })
}

function transportFor(record) {
  const urls = Array.isArray(record.rpcUrls) && record.rpcUrls.length ? record.rpcUrls : [record.rpcUrl]
  const transports = urls.map((url) => http(url, { timeout: 12_000, retryCount: 1 }))
  return transports.length === 1 ? transports[0] : fallback(transports)
}

function decodeKnownLog(log) {
  const topic0 = log.topics?.[0]?.toLowerCase()
  try {
    if (topic0 === TOPICS.pairV2.toLowerCase()) {
      const decoded = decodeEventLog({ abi: [PAIR_CREATED_V2], data: log.data, topics: log.topics, strict: false })
      return { kind: 'pool', standard: 'uniswap-v2', args: decoded.args }
    }
    if (topic0 === TOPICS.poolV3.toLowerCase()) {
      const decoded = decodeEventLog({ abi: [POOL_CREATED_V3], data: log.data, topics: log.topics, strict: false })
      return { kind: 'pool', standard: 'uniswap-v3', args: decoded.args }
    }
    if (topic0 === TOPICS.swapV2.toLowerCase()) {
      const decoded = decodeEventLog({ abi: [SWAP_V2], data: log.data, topics: log.topics, strict: false })
      return { kind: 'swap', standard: 'uniswap-v2', args: decoded.args }
    }
    if (topic0 === TOPICS.swapV3.toLowerCase()) {
      const decoded = decodeEventLog({ abi: [SWAP_V3], data: log.data, topics: log.topics, strict: false })
      return { kind: 'swap', standard: 'uniswap-v3', args: decoded.args }
    }
  } catch { return null }
  return null
}

async function safeRead(client, request) {
  try { return await client.readContract(request) } catch { return undefined }
}

async function fetchJson(url, timeoutMs = 6_000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json' } })
    if (!response.ok) return undefined
    return await response.json()
  } catch {
    return undefined
  } finally {
    clearTimeout(timer)
  }
}

function storageAddress(value) {
  try {
    if (!value || value === '0x' || BigInt(value) === 0n) return null
    return normalizeAddress(`0x${String(value).slice(-40)}`)
  } catch { return null }
}

async function blockscoutEvidence(explorerUrl, address, totalSupply) {
  if (!explorerUrl) return { verified: null, changedBytecode: null, implementation: null, holdersCount: null, transfersCount: null, holderConcentration: null }
  const base = explorerUrl.replace(/\/$/, '')
  const [addressInfo, contractInfo, counters, holders] = await Promise.all([
    fetchJson(`${base}/api/v2/addresses/${address}`),
    fetchJson(`${base}/api/v2/smart-contracts/${address}`),
    fetchJson(`${base}/api/v2/tokens/${address}/counters`),
    fetchJson(`${base}/api/v2/tokens/${address}/holders`)
  ])
  let holderConcentration = null
  try {
    if (totalSupply && BigInt(totalSupply) > 0n && Array.isArray(holders?.items) && holders.items.length) {
      const sampled = holders.items.slice(0, 10).reduce((sum, item) => sum + BigInt(item.value ?? 0), 0n)
      holderConcentration = Number(sampled * 10_000n / BigInt(totalSupply)) / 10_000
    }
  } catch { holderConcentration = null }
  return {
    verified: contractInfo?.is_fully_verified ?? contractInfo?.is_verified ?? addressInfo?.is_verified ?? null,
    changedBytecode: contractInfo?.is_changed_bytecode ?? null,
    implementation: normalizeAddress(contractInfo?.implementation_address ?? addressInfo?.implementation_address),
    holdersCount: counters?.token_holders_count ?? addressInfo?.token?.holders_count ?? null,
    transfersCount: counters?.transfers_count ?? null,
    holderConcentration
  }
}

async function probeToken(client, address) {
  const [name, symbol, decimals, totalSupply, owner, paused] = await Promise.all([
    safeRead(client, { address, abi: ERC20_PROBE_ABI, functionName: 'name' }),
    safeRead(client, { address, abi: ERC20_PROBE_ABI, functionName: 'symbol' }),
    safeRead(client, { address, abi: ERC20_PROBE_ABI, functionName: 'decimals' }),
    safeRead(client, { address, abi: ERC20_PROBE_ABI, functionName: 'totalSupply' }),
    safeRead(client, { address, abi: ERC20_PROBE_ABI, functionName: 'owner' }),
    safeRead(client, { address, abi: ERC20_PROBE_ABI, functionName: 'paused' })
  ])
  const tokenLike = typeof symbol === 'string' && typeof decimals === 'number' && typeof totalSupply === 'bigint'
  return {
    tokenLike,
    name: sanitizeText(name, 96),
    symbol: sanitizeText(symbol, 32),
    decimals: typeof decimals === 'number' ? decimals : null,
    totalSupply: typeof totalSupply === 'bigint' ? totalSupply.toString() : null,
    owner: typeof owner === 'string' && isAddress(owner) ? getAddress(owner) : null,
    paused: typeof paused === 'boolean' ? paused : null
  }
}

function parseFactoryLabels(raw = []) {
  const labels = new Map()
  for (const item of raw) {
    const address = normalizeAddress(item?.address)
    const chainId = asNumber(item?.chainId)
    if (!address || !chainId) continue
    labels.set(`${chainId}:${address.toLowerCase()}`, sanitizeText(item.name, 80) ?? 'Configured DEX factory')
  }
  return labels
}

function decimalRatio(numerator, denominator, precision = 12) {
  if (numerator <= 0n || denominator <= 0n) return null
  const scale = 10n ** BigInt(precision)
  const scaled = numerator * scale / denominator
  const whole = scaled / scale
  const fraction = (scaled % scale).toString().padStart(precision, '0').replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : whole.toString()
}

function blockValue(item) {
  try { return BigInt(item?.blockNumber ?? 0) } catch { return 0n }
}

export function createChainScout(config) {
  const emitter = new EventEmitter()
  emitter.setMaxListeners(200)
  const maxRecords = config.scoutMaxRecords ?? 5_000
  const blockConcurrency = config.scoutBlockConcurrency ?? 8
  const receiptConcurrency = config.scoutReceiptConcurrency ?? 8
  const confirmations = config.scoutConfirmations ?? 0
  const reorgRewind = config.scoutReorgRewind ?? 16
  const stateFile = config.scoutStateFile || null
  const journalFile = config.scoutEventJournalFile || null
  const poolRefreshMs = config.scoutPoolRefreshMs ?? 15_000
  const poolRefreshLimit = config.scoutPoolRefreshLimit ?? 100
  const chains = config.scoutChains.map((item) => {
    const chain = chainFromRecord(item)
    return {
      ...item,
      rpcUrls: Array.isArray(item.rpcUrls) && item.rpcUrls.length ? item.rpcUrls : [item.rpcUrl],
      chain,
      client: createPublicClient({ chain, transport: transportFor(item), cacheTime: 0 })
    }
  })
  const chainById = new Map(chains.map((item) => [item.chainId, item]))
  const labels = parseLabels(config.scoutLabelsFile)
  const factoryLabels = parseFactoryLabels(config.scoutDexFactories)
  const watchWallets = parseWatchWallets(config.scoutWatchWallets)
  const heads = new Map()
  const headHashes = new Map()
  const observedHeads = new Map()
  const observedAt = new Map()
  const advancedAt = new Map()
  const rpcLatencies = new Map()
  const chainErrors = new Map()
  const polling = new Set()
  const seen = new Set()
  const poolIndex = new Map()
  const contractIndex = new Map()
  const pendingUnwatchers = []
  let pollTimer
  let flushTimer
  let journalStream
  let running = false
  let lastError = null
  let startedAt = null
  let dirty = false
  let lastPersistedAt = null
  let lastPoolRefreshAt = 0
  let poolRefreshCursor = 0
  let lastDaoRefreshAt = 0
  let daoRefreshCursor = 0

  const state = {
    contracts: [],
    tokens: [],
    pools: [],
    swaps: [],
    pending: [],
    walletActivity: [],
    events: [],
    codeFamilies: new Map(),
    deployers: new Map()
  }

  function labelFor(chainId, address) {
    return labels.addressIndex.get(`${chainId}:${String(address).toLowerCase()}`) ?? null
  }

  function watchFor(chainId, address) {
    return watchWallets.get(`${chainId}:${String(address).toLowerCase()}`) ?? null
  }

  function addEvidence(record, address, role) {
    const label = labelFor(record.chainId, address)
    const watch = watchFor(record.chainId, address)
    const output = []
    if (label) output.push({
      type: 'public-label',
      entityId: label.entity.id,
      entityName: label.entity.name,
      entityKind: label.entity.kind,
      address: getAddress(address),
      role: label.evidence.role ?? role,
      source: label.evidence.source,
      confidence: label.evidence.confidence
    })
    if (watch) output.push({
      type: 'configured-wallet-watch',
      entityName: watch.label,
      entityKind: watch.category,
      address: watch.address,
      role,
      source: watch.source,
      confidence: watch.confidence
    })
    return output
  }

  function writeJournal(event) {
    if (!journalStream) return
    try { journalStream.write(`${JSON.stringify(event)}\n`) } catch (error) {
      lastError = `Scout journal: ${error instanceof Error ? error.message : error}`
    }
  }

  function emit(kind, record) {
    const event = { id: `${kind}:${record.chainId}:${record.transactionHash ?? record.address ?? Date.now()}:${record.logIndex ?? ''}`, kind, at: new Date().toISOString(), ...record }
    boundedPush(state.events, event, maxRecords)
    dirty = true
    writeJournal(event)
    emitter.emit('event', event)
    return event
  }

  function rememberDeployer(contract) {
    const key = `${contract.chainId}:${contract.deployer.toLowerCase()}`
    const current = state.deployers.get(key) ?? {
      chainId: contract.chainId,
      chain: contract.chain,
      address: contract.deployer,
      firstSeenBlock: contract.blockNumber,
      lastSeenBlock: contract.blockNumber,
      contracts: 0,
      tokens: 0,
      pools: 0,
      codeHashes: new Set(),
      evidence: addEvidence(contract, contract.deployer, 'deployer')
    }
    current.contracts += 1
    current.tokens += contract.token ? 1 : 0
    current.firstSeenBlock = String(BigInt(current.firstSeenBlock) < BigInt(contract.blockNumber) ? current.firstSeenBlock : contract.blockNumber)
    current.lastSeenBlock = String(BigInt(current.lastSeenBlock) > BigInt(contract.blockNumber) ? current.lastSeenBlock : contract.blockNumber)
    current.codeHashes.add(contract.codeHash)
    state.deployers.set(key, current)
  }

  function rememberCodeFamily(contract) {
    const key = String(contract.codeHash).toLowerCase()
    const current = state.codeFamilies.get(key) ?? { codeHash: contract.codeHash, deployments: [] }
    current.deployments.unshift({
      chainId: contract.chainId,
      chain: contract.chain,
      address: contract.address,
      deployer: contract.deployer,
      blockNumber: contract.blockNumber,
      transactionHash: contract.transactionHash,
      token: contract.token ? { name: contract.token.name, symbol: contract.token.symbol } : null
    })
    if (current.deployments.length > 100) current.deployments.length = 100
    state.codeFamilies.set(key, current)
  }

  function rebuildIndexes() {
    state.deployers = new Map()
    state.codeFamilies = new Map()
    poolIndex.clear()
    contractIndex.clear()
    for (const contract of state.contracts) {
      rememberDeployer(contract)
      rememberCodeFamily(contract)
      contractIndex.set(`${contract.chainId}:${contract.address.toLowerCase()}`, contract)
    }
    for (const pool of state.pools) poolIndex.set(`${pool.chainId}:${pool.pool.toLowerCase()}`, pool)
  }

  function rebuildSeen() {
    seen.clear()
    for (const item of state.contracts) seen.add(`contract:${item.chainId}:${item.address.toLowerCase()}`)
    for (const item of state.pools) seen.add(`log:${item.chainId}:${item.transactionHash}:${item.logIndex}`)
    for (const item of state.swaps) seen.add(`log:${item.chainId}:${item.transactionHash}:${item.logIndex}`)
    for (const item of state.pending) seen.add(`pending:${item.chainId}:${item.transactionHash}`)
    for (const item of state.walletActivity) seen.add(`wallet:${item.chainId}:${item.transactionHash}`)
  }

  function restoreState() {
    const saved = safeJsonFile(stateFile, null)
    if (!saved || ![2, 3].includes(saved.version)) return
    for (const key of ['contracts', 'tokens', 'pools', 'swaps', 'pending', 'walletActivity', 'events']) {
      state[key] = Array.isArray(saved[key]) ? saved[key].slice(0, maxRecords) : []
    }
    for (const item of Array.isArray(saved.heads) ? saved.heads : []) {
      const chainId = asNumber(item.chainId)
      if (!chainId || !/^\d+$/.test(String(item.number ?? ''))) continue
      heads.set(chainId, BigInt(item.number))
      if (/^0x[0-9a-fA-F]{64}$/.test(String(item.hash ?? ''))) headHashes.set(chainId, String(item.hash).toLowerCase())
    }
    lastPersistedAt = sanitizeText(saved.savedAt, 64)
    rebuildIndexes()
    rebuildSeen()
  }

  function persistState(force = false) {
    if (!stateFile || (!dirty && !force)) return
    try {
      fs.mkdirSync(path.dirname(stateFile), { recursive: true })
      const payload = {
        version: 3,
        savedAt: new Date().toISOString(),
        heads: [...heads.entries()].map(([chainId, number]) => ({ chainId, number: number.toString(), hash: headHashes.get(chainId) ?? null })),
        contracts: state.contracts,
        tokens: state.tokens,
        pools: state.pools,
        swaps: state.swaps,
        pending: state.pending,
        walletActivity: state.walletActivity,
        events: state.events
      }
      const temporary = `${stateFile}.${process.pid}.tmp`
      fs.writeFileSync(temporary, JSON.stringify(payload))
      fs.renameSync(temporary, stateFile)
      dirty = false
      lastPersistedAt = payload.savedAt
    } catch (error) {
      lastError = `Scout persistence: ${error instanceof Error ? error.message : error}`
      console.error(lastError)
    }
  }

  function pruneChainFrom(chainId, fromBlock) {
    const keep = (item) => item.chainId !== chainId || blockValue(item) < fromBlock
    state.contracts = state.contracts.filter(keep)
    state.tokens = state.tokens.filter(keep)
    state.pools = state.pools.filter(keep)
    state.swaps = state.swaps.filter(keep)
    state.walletActivity = state.walletActivity.filter(keep)
    state.events = state.events.filter(keep)
    rebuildIndexes()
    rebuildSeen()
    dirty = true
  }

  async function snapshotPool(record, item) {
    const previousMarket = item.market ? { ...item.market } : null
    try {
      if (item.standard === 'uniswap-v2') {
        const [token0, token1, reserves, totalSupply, observedAtBlock] = await Promise.all([
          record.client.readContract({ address: item.pool, abi: V2_PAIR_ABI, functionName: 'token0' }),
          record.client.readContract({ address: item.pool, abi: V2_PAIR_ABI, functionName: 'token1' }),
          record.client.readContract({ address: item.pool, abi: V2_PAIR_ABI, functionName: 'getReserves' }),
          record.client.readContract({ address: item.pool, abi: V2_PAIR_ABI, functionName: 'totalSupply' }).catch(() => 0n),
          record.client.getBlockNumber()
        ])
        if (token0.toLowerCase() !== item.token0.toLowerCase() || token1.toLowerCase() !== item.token1.toLowerCase()) throw new Error('V2 pool token mismatch')
        const decimals0 = item.token0Meta?.decimals ?? 18
        const decimals1 = item.token1Meta?.decimals ?? 18
        const reserve0 = BigInt(reserves[0])
        const reserve1 = BigInt(reserves[1])
        item.market = {
          kind: 'v2-reserves',
          reserve0: reserve0.toString(),
          reserve1: reserve1.toString(),
          totalSupply: BigInt(totalSupply).toString(),
          liquidity: null,
          sqrtPriceX96: null,
          tick: null,
          price1Per0: decimalRatio(reserve1 * 10n ** BigInt(decimals0), reserve0 * 10n ** BigInt(decimals1)),
          price0Per1: decimalRatio(reserve0 * 10n ** BigInt(decimals1), reserve1 * 10n ** BigInt(decimals0)),
          hasLiquidity: reserve0 > 0n && reserve1 > 0n,
          observedAtBlock: observedAtBlock.toString(),
          updatedAt: new Date().toISOString()
        }
      } else {
        const [token0, token1, fee, liquidity, slot0, observedAtBlock] = await Promise.all([
          record.client.readContract({ address: item.pool, abi: V3_POOL_ABI, functionName: 'token0' }),
          record.client.readContract({ address: item.pool, abi: V3_POOL_ABI, functionName: 'token1' }),
          record.client.readContract({ address: item.pool, abi: V3_POOL_ABI, functionName: 'fee' }),
          record.client.readContract({ address: item.pool, abi: V3_POOL_ABI, functionName: 'liquidity' }),
          record.client.readContract({ address: item.pool, abi: V3_POOL_ABI, functionName: 'slot0' }),
          record.client.getBlockNumber()
        ])
        if (token0.toLowerCase() !== item.token0.toLowerCase() || token1.toLowerCase() !== item.token1.toLowerCase()) throw new Error('V3 pool token mismatch')
        const decimals0 = item.token0Meta?.decimals ?? 18
        const decimals1 = item.token1Meta?.decimals ?? 18
        const sqrtPriceX96 = BigInt(slot0[0])
        const ratioNumerator = sqrtPriceX96 * sqrtPriceX96 * 10n ** BigInt(decimals0)
        const ratioDenominator = (1n << 192n) * 10n ** BigInt(decimals1)
        item.fee = Number(fee)
        item.market = {
          kind: 'v3-liquidity',
          reserve0: null,
          reserve1: null,
          totalSupply: null,
          liquidity: BigInt(liquidity).toString(),
          sqrtPriceX96: sqrtPriceX96.toString(),
          tick: Number(slot0[1]),
          price1Per0: decimalRatio(ratioNumerator, ratioDenominator),
          price0Per1: decimalRatio(ratioDenominator, ratioNumerator),
          hasLiquidity: BigInt(liquidity) > 0n && sqrtPriceX96 > 0n,
          observedAtBlock: observedAtBlock.toString(),
          updatedAt: new Date().toISOString()
        }
      }
      const indexed = poolIndex.has(`${item.chainId}:${item.pool.toLowerCase()}`)
      if (indexed && previousMarket?.hasLiquidity === true) {
        let dropBps = 0
        if (item.standard === 'uniswap-v2' && previousMarket.reserve0 && previousMarket.reserve1 && item.market.reserve0 && item.market.reserve1) {
          const old0 = BigInt(previousMarket.reserve0), old1 = BigInt(previousMarket.reserve1)
          const next0 = BigInt(item.market.reserve0), next1 = BigInt(item.market.reserve1)
          if (old0 > 0n && old1 > 0n) {
            const retained = [next0 * 10_000n / old0, next1 * 10_000n / old1].reduce((a, b) => a < b ? a : b)
            dropBps = Number(retained >= 10_000n ? 0n : 10_000n - retained)
          }
        } else if (item.standard === 'uniswap-v3' && previousMarket.liquidity && item.market.liquidity) {
          const oldLiquidity = BigInt(previousMarket.liquidity)
          const nextLiquidity = BigInt(item.market.liquidity)
          if (oldLiquidity > 0n) {
            const retained = nextLiquidity * 10_000n / oldLiquidity
            dropBps = Number(retained >= 10_000n ? 0n : 10_000n - retained)
          }
        }
        if (item.market.hasLiquidity === false) {
          emit('pool-liquidity-removed', { ...item, address: item.pool, transactionHash: null, previousMarket, liquidityDropBps: 10_000 })
        } else if (dropBps >= (config.scoutLiquidityDropBps ?? 5_000)) {
          emit('external-liquidity-drop', { ...item, address: item.pool, transactionHash: null, previousMarket, liquidityDropBps: dropBps })
        }
      }
      dirty = true
      return item.market
    } catch (error) {
      item.market = {
        kind: item.standard === 'uniswap-v2' ? 'v2-reserves' : 'v3-liquidity',
        reserve0: null,
        reserve1: null,
        totalSupply: null,
        liquidity: null,
        sqrtPriceX96: null,
        tick: null,
        price1Per0: null,
        price0Per1: null,
        hasLiquidity: false,
        observedAtBlock: null,
        updatedAt: new Date().toISOString(),
        error: sanitizeText(error instanceof Error ? error.message : String(error), 240)
      }
      dirty = true
      return item.market
    }
  }

  function activePoolEvidence(chainId, address) {
    const needle = String(address).toLowerCase()
    return state.pools.some((pool) => pool.chainId === chainId
      && pool.market?.hasLiquidity === true
      && (pool.token0?.toLowerCase() === needle || pool.token1?.toLowerCase() === needle))
  }

  function updateDaoAssessment(contract, nativeBalanceWei = contract.dao?.nativeBalanceWei ?? '0') {
    if (!contract.dao?.candidate) return null
    contract.dao.nativeBalanceWei = numericString(nativeBalanceWei)
    contract.dao.abandonment = assessDaoDormancy({
      deployedAt: contract.timestamp,
      lastActivityAt: contract.lastActivityTimestamp ?? contract.timestamp,
      observedCallCount: contract.observedCallCount ?? 0,
      nativeBalanceWei: contract.dao.nativeBalanceWei,
      hasLiveLiquidity: activePoolEvidence(contract.chainId, contract.address),
      minAgeDays: config.daoMinimumAgeDays,
      inactiveDays: config.daoInactiveDays,
      lowBalanceWei: config.daoLowNativeBalanceWei
    })
    contract.dao.updatedAt = new Date().toISOString()
    dirty = true
    return contract.dao.abandonment
  }

  function recordContractActivity(record, tx, timestamp, blockNumber) {
    const target = normalizeAddress(tx.to)
    if (!target) return
    const contract = contractIndex.get(`${record.chainId}:${target.toLowerCase()}`)
    if (!contract) return
    const currentBlock = BigInt(contract.lastActivityBlock ?? contract.blockNumber ?? '0')
    if (blockNumber < currentBlock) return
    const previousStatus = contract.dao?.abandonment?.status ?? null
    contract.lastActivityBlock = blockNumber.toString()
    contract.lastActivityTimestamp = timestamp
    contract.lastActivityTransactionHash = tx.hash
    contract.lastCaller = normalizeAddress(tx.from)
    contract.observedCallCount = asNumber(contract.observedCallCount) + 1
    try { contract.observedValueInWei = (BigInt(contract.observedValueInWei ?? '0') + BigInt(tx.value ?? 0n)).toString() } catch { contract.observedValueInWei = numericString(contract.observedValueInWei) }
    const next = updateDaoAssessment(contract)
    if (contract.dao?.candidate && previousStatus === 'dormant-candidate' && next?.status === 'active-evidence') {
      emit('dao-activity-resumed', {
        chainId: contract.chainId,
        chain: contract.chain,
        explorerUrl: contract.explorerUrl,
        address: contract.address,
        blockNumber: contract.lastActivityBlock,
        transactionHash: tx.hash,
        timestamp,
        dormancy: next
      })
    }
    dirty = true
  }

  async function inspectContract(record, tx, receipt) {
    const address = normalizeAddress(receipt.contractAddress)
    const deployer = normalizeAddress(tx.from)
    if (!address || !deployer) return
    const id = `contract:${record.chainId}:${address.toLowerCase()}`
    if (seen.has(id)) return
    seen.add(id)

    const bytecode = await record.client.getBytecode({ address }).catch(() => '0x')
    if (!bytecode || bytecode === '0x') return
    const token = await probeToken(record.client, address)
    const staticRisk = analyzeBytecode(bytecode, { tokenAddress: address })
    const daoFingerprint = config.daoIntelligenceEnabled ? analyzeDaoBytecode(bytecode) : null
    let dao = null
    if (daoFingerprint?.candidate) {
      const [nativeBalance, probe] = await Promise.all([
        record.client.getBalance({ address }).catch(() => 0n),
        probeDaoContract(record.client, address, daoFingerprint, receipt.blockNumber).catch(() => null)
      ])
      dao = {
        ...daoFingerprint,
        probe,
        nativeBalanceWei: nativeBalance.toString(),
        abandonment: null,
        updatedAt: new Date().toISOString()
      }
    }
    const evidence = [
      ...addEvidence(record, address, 'contract'),
      ...addEvidence(record, deployer, 'deployer')
    ]
    const contract = {
      chainId: record.chainId,
      chain: record.name,
      explorerUrl: record.explorerUrl,
      address,
      deployer,
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber.toString(),
      timestamp: record.timestamp,
      codeHash: keccak256(bytecode),
      codeSize: Math.max(0, (bytecode.length - 2) / 2),
      risk: { status: staticRisk.status, score: staticRisk.score, findings: staticRisk.findings.slice(0, 20) },
      token: token.tokenLike ? token : null,
      dao,
      lastActivityBlock: receipt.blockNumber.toString(),
      lastActivityTimestamp: record.timestamp,
      lastActivityTransactionHash: receipt.transactionHash,
      lastCaller: deployer,
      observedCallCount: 0,
      observedValueInWei: BigInt(tx.value ?? 0n).toString(),
      evidence
    }
    if (dao) updateDaoAssessment(contract, dao.nativeBalanceWei)
    rememberDeployer(contract)
    rememberCodeFamily(contract)
    boundedPush(state.contracts, contract, maxRecords)
    contractIndex.set(`${record.chainId}:${address.toLowerCase()}`, contract)
    emit('contract-created', contract)
    if (token.tokenLike) {
      boundedPush(state.tokens, contract, maxRecords)
      emit('token-detected', contract)
    }
    if (dao?.candidate) emit('dao-candidate-detected', contract)
    if (watchFor(record.chainId, deployer)) emit('watched-wallet-deployment', contract)
  }

  function recordWatchedTransaction(record, tx, timestamp, blockNumber) {
    const from = normalizeAddress(tx.from)
    const to = normalizeAddress(tx.to)
    const matches = []
    const fromWatch = from ? watchFor(record.chainId, from) : null
    const toWatch = to ? watchFor(record.chainId, to) : null
    if (fromWatch) matches.push({ role: 'sender', ...fromWatch })
    if (toWatch) matches.push({ role: 'recipient', ...toWatch })
    if (!matches.length) return
    const id = `wallet:${record.chainId}:${tx.hash}`
    if (seen.has(id)) return
    seen.add(id)
    const item = {
      chainId: record.chainId,
      chain: record.name,
      explorerUrl: record.explorerUrl,
      transactionHash: tx.hash,
      blockNumber: blockNumber.toString(),
      timestamp,
      from,
      to,
      contractCreation: tx.to === null,
      value: BigInt(tx.value ?? 0n).toString(),
      method: typeof tx.input === 'string' && tx.input.length >= 10 ? tx.input.slice(0, 10) : '0x',
      matches
    }
    boundedPush(state.walletActivity, item, maxRecords)
    emit('watched-wallet-activity', item)
  }

  async function processLog(record, log) {
    const decoded = decodeKnownLog(log)
    if (!decoded) return
    const id = `log:${record.chainId}:${log.transactionHash}:${log.logIndex}`
    if (seen.has(id)) return
    seen.add(id)
    const factoryKey = `${record.chainId}:${log.address.toLowerCase()}`
    const factoryName = factoryLabels.get(factoryKey) ?? null
    if (decoded.kind === 'pool') {
      const token0 = normalizeAddress(decoded.args.token0)
      const token1 = normalizeAddress(decoded.args.token1)
      const pool = normalizeAddress(decoded.args.pair ?? decoded.args.pool)
      if (!token0 || !token1 || !pool) return
      const [token0Meta, token1Meta] = await Promise.all([probeToken(record.client, token0), probeToken(record.client, token1)])
      const item = {
        chainId: record.chainId,
        chain: record.name,
        explorerUrl: record.explorerUrl,
        standard: decoded.standard,
        factory: getAddress(log.address),
        factoryName,
        verifiedFactory: Boolean(factoryName),
        token0,
        token1,
        token0Meta: token0Meta.tokenLike ? token0Meta : null,
        token1Meta: token1Meta.tokenLike ? token1Meta : null,
        pool,
        fee: decoded.args.fee === undefined ? null : Number(decoded.args.fee),
        tickSpacing: decoded.args.tickSpacing === undefined ? null : Number(decoded.args.tickSpacing),
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber.toString(),
        logIndex: Number(log.logIndex),
        timestamp: record.timestamp,
        swapCount: 0,
        lastSwapAt: null,
        market: null,
        evidence: [
          ...addEvidence(record, log.address, 'factory'),
          ...addEvidence(record, token0, 'token0'),
          ...addEvidence(record, token1, 'token1')
        ]
      }
      await snapshotPool(record, item)
      boundedPush(state.pools, item, maxRecords)
      poolIndex.set(`${record.chainId}:${pool.toLowerCase()}`, item)
      emit('pool-created', item)
      if (item.market?.hasLiquidity) emit('pool-liquidity-live', item)
      return
    }
    const known = poolIndex.get(`${record.chainId}:${log.address.toLowerCase()}`)
    const item = {
      chainId: record.chainId,
      chain: record.name,
      explorerUrl: record.explorerUrl,
      standard: decoded.standard,
      pool: getAddress(log.address),
      transactionHash: log.transactionHash,
      blockNumber: log.blockNumber.toString(),
      logIndex: Number(log.logIndex),
      timestamp: record.timestamp,
      sender: normalizeAddress(decoded.args.sender),
      recipient: normalizeAddress(decoded.args.recipient ?? decoded.args.to),
      amounts: Object.fromEntries(Object.entries(decoded.args).filter(([key]) => key.startsWith('amount')).map(([key, value]) => [key, typeof value === 'bigint' ? value.toString() : String(value)])),
      sqrtPriceX96: decoded.args.sqrtPriceX96?.toString?.() ?? null,
      liquidity: decoded.args.liquidity?.toString?.() ?? null,
      tick: decoded.args.tick === undefined ? null : Number(decoded.args.tick),
      pair: known ? { token0: known.token0, token1: known.token1, token0Meta: known.token0Meta, token1Meta: known.token1Meta } : null,
      evidence: addEvidence(record, log.address, 'pool')
    }
    boundedPush(state.swaps, item, maxRecords)
    if (known) {
      known.swapCount = asNumber(known.swapCount) + 1
      known.lastSwapAt = record.timestamp
      const updatedAt = Date.parse(known.market?.updatedAt ?? '')
      if (!Number.isFinite(updatedAt) || Date.now() - updatedAt >= Math.min(poolRefreshMs, 3_000)) await snapshotPool(record, known)
    }
    emit('swap-observed', item)
  }

  async function processRange(record, fromBlock, toBlock) {
    const blockNumbers = Array.from({ length: Number(toBlock - fromBlock + 1n) }, (_, index) => fromBlock + BigInt(index))
    const poolLogsPromise = record.client.getLogs({ events: SCOUT_POOL_EVENTS, strict: false, fromBlock, toBlock }).catch((error) => {
      console.error(`Scout pool logs ${record.name}:`, error instanceof Error ? error.message : error)
      return []
    })
    const blocks = await mapLimit(blockNumbers, blockConcurrency, async (blockNumber) => record.client.getBlock({ blockNumber, includeTransactions: true }).catch(() => null))
    const timestamps = new Map()
    const creations = []
    const transactions = []
    for (const block of blocks) {
      if (!block) continue
      const timestamp = Number(block.timestamp)
      const scannedBlockNumber = block['number']
      timestamps.set(scannedBlockNumber.toString(), timestamp)
      for (const tx of block.transactions) {
        if (typeof tx === 'string') continue
        transactions.push({ tx, timestamp, blockNumber: scannedBlockNumber })
        if (tx.to === null) creations.push({ tx, timestamp })
      }
    }
    await mapLimit(creations, receiptConcurrency, async ({ tx, timestamp }) => {
      const receipt = await record.client.getTransactionReceipt({ hash: tx.hash }).catch(() => null)
      if (receipt?.contractAddress) await inspectContract({ ...record, timestamp }, tx, receipt)
    })
    for (const item of transactions) {
      recordWatchedTransaction(record, item.tx, item.timestamp, item.blockNumber)
      recordContractActivity(record, item.tx, item.timestamp, item.blockNumber)
    }

    const timestampFor = async (log) => {
      let timestamp = timestamps.get(log.blockNumber.toString())
      if (timestamp === undefined) {
        const block = await record.client.getBlock({ blockNumber: log.blockNumber }).catch(() => null)
        timestamp = block ? Number(block.timestamp) : null
        if (timestamp !== null) timestamps.set(log.blockNumber.toString(), timestamp)
      }
      return timestamp
    }

    const poolLogs = await poolLogsPromise
    poolLogs.sort((left, right) => Number(left.blockNumber - right.blockNumber) || Number(left.logIndex - right.logIndex))
    for (const log of poolLogs) await processLog({ ...record, timestamp: await timestampFor(log) }, log)

    const poolAddresses = [...new Set(state.pools
      .filter((pool) => pool.chainId === record.chainId && normalizeAddress(pool.pool))
      .map((pool) => getAddress(pool.pool)))]
    const addressBatches = chunk(poolAddresses, 100)
    const swapGroups = await mapLimit(addressBatches, Math.min(4, blockConcurrency), async (addresses) => record.client.getLogs({
      address: addresses,
      events: SCOUT_SWAP_EVENTS,
      strict: false,
      fromBlock,
      toBlock
    }).catch((error) => {
      console.error(`Scout tracked-pool swap logs ${record.name}:`, error instanceof Error ? error.message : error)
      return []
    }))
    const swapLogs = swapGroups.flat()
    swapLogs.sort((left, right) => Number(left.blockNumber - right.blockNumber) || Number(left.logIndex - right.logIndex))
    for (const log of swapLogs) await processLog({ ...record, timestamp: await timestampFor(log) }, log)
  }

  async function verifyCheckpoint(record, previous) {
    const expectedHash = headHashes.get(record.chainId)
    if (!expectedHash || previous < 0n) return previous
    const block = await record.client.getBlock({ blockNumber: previous }).catch(() => null)
    if (block?.hash?.toLowerCase() === expectedHash) return previous
    const configuredStart = record.startBlock === null || record.startBlock === undefined ? 0n : BigInt(record.startBlock)
    const rewindFrom = previous > BigInt(reorgRewind) ? previous - BigInt(reorgRewind) + 1n : configuredStart
    const safeRewind = rewindFrom > configuredStart ? rewindFrom : configuredStart
    pruneChainFrom(record.chainId, safeRewind)
    const newHead = safeRewind > 0n ? safeRewind - 1n : -1n
    if (newHead >= 0n) {
      heads.set(record.chainId, newHead)
      const prior = await record.client.getBlock({ blockNumber: newHead }).catch(() => null)
      if (prior?.hash) headHashes.set(record.chainId, prior.hash.toLowerCase())
      else headHashes.delete(record.chainId)
    } else {
      heads.delete(record.chainId)
      headHashes.delete(record.chainId)
    }
    emit('chain-reorg', {
      chainId: record.chainId,
      chain: record.name,
      blockNumber: safeRewind.toString(),
      previousHead: previous.toString(),
      rewindFrom: safeRewind.toString(),
      transactionHash: null,
      detail: 'Stored checkpoint hash no longer matches the provider. Hot-cache records were rewound and will be replayed.'
    })
    return newHead
  }

  async function refreshPools() {
    if (Date.now() - lastPoolRefreshAt < poolRefreshMs || !state.pools.length) return
    lastPoolRefreshAt = Date.now()
    if (poolRefreshCursor >= state.pools.length) poolRefreshCursor = 0
    const candidates = []
    for (let offset = 0; offset < Math.min(poolRefreshLimit, state.pools.length); offset += 1) {
      candidates.push(state.pools[(poolRefreshCursor + offset) % state.pools.length])
    }
    poolRefreshCursor = (poolRefreshCursor + candidates.length) % state.pools.length
    await mapLimit(candidates, Math.min(4, blockConcurrency), async (item) => {
      const record = chainById.get(item.chainId)
      if (record) await snapshotPool(record, item)
    })
  }

  async function refreshDaos() {
    if (!config.daoIntelligenceEnabled || Date.now() - lastDaoRefreshAt < (config.daoRefreshMs ?? 60_000)) return
    const all = state.contracts.filter((item) => item.dao?.candidate)
    if (!all.length) return
    lastDaoRefreshAt = Date.now()
    if (daoRefreshCursor >= all.length) daoRefreshCursor = 0
    const candidates = []
    for (let offset = 0; offset < Math.min(config.daoRefreshLimit ?? 50, all.length); offset += 1) {
      candidates.push(all[(daoRefreshCursor + offset) % all.length])
    }
    daoRefreshCursor = (daoRefreshCursor + candidates.length) % all.length
    await mapLimit(candidates, Math.min(4, blockConcurrency), async (contract) => {
      const record = chainById.get(contract.chainId)
      if (!record) return
      const previousStatus = contract.dao?.abandonment?.status ?? null
      const [nativeBalance, head, probe] = await Promise.all([
        record.client.getBalance({ address: contract.address }).catch(() => BigInt(contract.dao?.nativeBalanceWei ?? '0')),
        record.client.getBlockNumber().catch(() => null),
        probeDaoContract(record.client, contract.address, contract.dao, observedHeads.get(contract.chainId) ?? null).catch(() => contract.dao?.probe ?? null)
      ])
      contract.dao.probe = probe
      if (head !== null) contract.dao.observedAtBlock = head.toString()
      const assessment = updateDaoAssessment(contract, nativeBalance.toString())
      const shouldAlert = assessment?.status === 'dormant-candidate'
        && assessment.score >= (config.daoDormancyAlertScore ?? 70)
        && previousStatus !== 'dormant-candidate'
      if (shouldAlert) {
        contract.dao.dormancyAlertedAt = new Date().toISOString()
        emit('dao-dormancy-candidate', {
          chainId: contract.chainId,
          chain: contract.chain,
          explorerUrl: contract.explorerUrl,
          address: contract.address,
          deployer: contract.deployer,
          blockNumber: contract.lastActivityBlock ?? contract.blockNumber,
          transactionHash: null,
          timestamp: contract.lastActivityTimestamp ?? contract.timestamp,
          dao: contract.dao,
          limitation: contract.dao.abandonment.limitation
        })
      }
    })
  }

  async function pollChain(record) {
    if (polling.has(record.chainId)) return
    polling.add(record.chainId)
    try {
      const requestStartedAt = Date.now()
      const current = await record.client.getBlockNumber()
      rpcLatencies.set(record.chainId, Date.now() - requestStartedAt)
      const previousObserved = observedHeads.get(record.chainId)
      observedHeads.set(record.chainId, current)
      observedAt.set(record.chainId, Date.now())
      if (previousObserved === undefined || current > previousObserved) advancedAt.set(record.chainId, Date.now())
      chainErrors.delete(record.chainId)
      const chainConfirmations = record.confirmations ?? confirmations
      const safeCurrent = current > BigInt(chainConfirmations) ? current - BigInt(chainConfirmations) : 0n
      let previous = heads.get(record.chainId)
      if (previous !== undefined) previous = await verifyCheckpoint(record, previous)
      const configuredStart = record.startBlock === null || record.startBlock === undefined ? null : BigInt(record.startBlock)
      let fromBlock = previous === undefined || previous < 0n
        ? configuredStart ?? (safeCurrent >= BigInt((config.scoutInitialLookback ?? 100) - 1) ? safeCurrent - BigInt((config.scoutInitialLookback ?? 100) - 1) : 0n)
        : previous + 1n
      if (fromBlock > safeCurrent) {
        lastError = chainErrors.size ? [...chainErrors.values()].join('; ') : null
        return
      }
      while (fromBlock <= safeCurrent) {
        const span = BigInt((config.scoutMaxBlocksPerPoll ?? 100) - 1)
        const toBlock = fromBlock + span > safeCurrent ? safeCurrent : fromBlock + span
        await processRange(record, fromBlock, toBlock)
        const checkpoint = await record.client.getBlock({ blockNumber: toBlock }).catch(() => null)
        heads.set(record.chainId, toBlock)
        if (checkpoint?.hash) headHashes.set(record.chainId, checkpoint.hash.toLowerCase())
        dirty = true
        fromBlock = toBlock + 1n
      }
      lastError = chainErrors.size ? [...chainErrors.values()].join('; ') : null
    } catch (error) {
      const message = `${record.name}: ${error instanceof Error ? error.message : error}`
      chainErrors.set(record.chainId, message)
      lastError = [...chainErrors.values()].join('; ')
      console.error('Scout poll failed:', lastError)
    } finally {
      polling.delete(record.chainId)
    }
  }

  async function poll() {
    if (!config.scoutEnabled) return
    await Promise.allSettled(chains.map((chain) => pollChain(chain)))
    await refreshPools().catch((error) => { lastError = `Pool refresh: ${error instanceof Error ? error.message : error}` })
    await refreshDaos().catch((error) => { lastError = `DAO refresh: ${error instanceof Error ? error.message : error}` })
  }

  function startPending(record) {
    if (!config.scoutPendingEnabled || !record.wsUrl) return
    try {
      const pendingClient = createPublicClient({ chain: record.chain, transport: webSocket(record.wsUrl) })
      if (typeof pendingClient.watchPendingTransactions !== 'function') return
      const unwatch = pendingClient.watchPendingTransactions({
        batch: true,
        pollingInterval: Math.max(250, Math.min(3_000, config.scoutPendingPollIntervalMs ?? 1_000)),
        onTransactions: (hashes) => {
          void mapLimit(hashes.slice(0, config.scoutPendingBatchLimit ?? 100), Math.min(8, receiptConcurrency), async (hash) => {
            const id = `pending:${record.chainId}:${hash}`
            if (seen.has(id)) return
            const tx = await pendingClient.getTransaction({ hash }).catch(() => null)
            if (!tx || tx.to !== null) return
            seen.add(id)
            const deployer = normalizeAddress(tx.from)
            if (!deployer) return
            const watch = watchFor(record.chainId, deployer)
            const item = {
              chainId: record.chainId,
              chain: record.name,
              explorerUrl: record.explorerUrl,
              transactionHash: tx.hash,
              deployer,
              nonce: Number(tx.nonce),
              value: BigInt(tx.value ?? 0n).toString(),
              gas: BigInt(tx.gas ?? 0n).toString(),
              maxFeePerGas: tx.maxFeePerGas === undefined ? null : BigInt(tx.maxFeePerGas).toString(),
              inputHash: keccak256(tx.input),
              inputSize: Math.max(0, (tx.input.length - 2) / 2),
              firstSeenAt: new Date().toISOString(),
              trackedWallet: Boolean(watch),
              evidence: addEvidence(record, deployer, 'pending deployer')
            }
            boundedPush(state.pending, item, maxRecords)
            emit('pending-contract-creation', item)
          })
        },
        onError: (error) => {
          lastError = `${record.name} pending feed: ${error instanceof Error ? error.message : error}`
        }
      })
      pendingUnwatchers.push(unwatch)
    } catch (error) {
      lastError = `${record.name} pending feed: ${error instanceof Error ? error.message : error}`
    }
  }

  function start() {
    if (!config.scoutEnabled || running) return
    running = true
    startedAt = new Date().toISOString()
    if (journalFile) {
      try {
        fs.mkdirSync(path.dirname(journalFile), { recursive: true })
        journalStream = fs.createWriteStream(journalFile, { flags: 'a' })
        journalStream.on('error', (error) => { lastError = `Scout journal: ${error.message}` })
      } catch (error) { lastError = `Scout journal: ${error instanceof Error ? error.message : error}` }
    }
    for (const chain of chains) startPending(chain)
    void poll()
    pollTimer = setInterval(() => void poll(), config.scoutPollIntervalMs ?? 3_000)
    pollTimer.unref?.()
    flushTimer = setInterval(() => persistState(), config.scoutStateFlushMs ?? 5_000)
    flushTimer.unref?.()
  }

  function stop() {
    if (pollTimer) clearInterval(pollTimer)
    if (flushTimer) clearInterval(flushTimer)
    pollTimer = undefined
    flushTimer = undefined
    while (pendingUnwatchers.length) {
      try { pendingUnwatchers.pop()?.() } catch { /* best effort */ }
    }
    persistState(true)
    journalStream?.end()
    journalStream = undefined
    running = false
  }

  function filter(items, query = {}) {
    let output = [...items]
    if (query.chainId) output = output.filter((item) => item.chainId === Number(query.chainId))
    if (query.status) output = output.filter((item) => item.risk?.status?.toLowerCase() === String(query.status).toLowerCase())
    if (query.liquidity === 'active') output = output.filter((item) => item.market?.hasLiquidity === true)
    if (query.q) {
      const needle = String(query.q).toLowerCase()
      output = output.filter((item) => JSON.stringify(item).toLowerCase().includes(needle))
    }
    return output.slice(0, Math.max(1, Math.min(500, Number(query.limit ?? 100))))
  }

  function summary() {
    const now = Date.now()
    const daoCandidates = state.contracts.filter((item) => item.dao?.candidate)
    return {
      enabled: config.scoutEnabled,
      running,
      startedAt,
      lastError,
      pollIntervalMs: config.scoutPollIntervalMs ?? 3_000,
      confirmations,
      reorgRewind,
      statePersistence: Boolean(stateFile),
      lastPersistedAt,
      journalEnabled: Boolean(journalFile),
      coverage: chains.map((record) => {
        const observed = observedHeads.get(record.chainId)
        const indexed = heads.get(record.chainId)
        const chainConfirmations = record.confirmations ?? confirmations
        const safeHead = observed === undefined ? null : observed > BigInt(chainConfirmations) ? observed - BigInt(chainConfirmations) : 0n
        const lastObservedAt = observedAt.get(record.chainId) ?? null
        const lastAdvancedAt = advancedAt.get(record.chainId) ?? null
        const expectedBlockTimeMs = record.expectedBlockTimeMs ?? 12_000
        const stallAfterMs = record.stallAfterMs ?? Math.max(config.scoutChainStallMs ?? 60_000, expectedBlockTimeMs * 6)
        const stalledForMs = lastAdvancedAt === null ? null : Math.max(0, now - lastAdvancedAt)
        const lagBlocks = indexed === undefined || safeHead === null ? null : (safeHead > indexed ? safeHead - indexed : 0n)
        const chainError = chainErrors.get(record.chainId) ?? null
        const status = chainError && observed === undefined
          ? 'offline'
          : lagBlocks !== null && lagBlocks > 0n
            ? 'syncing'
            : stalledForMs !== null && stalledForMs > stallAfterMs
              ? 'stalled'
              : observed === undefined
                ? 'starting'
                : 'healthy'
        return {
          chainId: record.chainId,
          name: record.name,
          explorerUrl: record.explorerUrl,
          rpc: publicRpcLabel(record.rpcUrls),
          head: indexed?.toString() ?? null,
          observedHead: observed?.toString() ?? null,
          safeHead: safeHead?.toString() ?? null,
          startBlock: record.startBlock === null || record.startBlock === undefined ? null : String(record.startBlock),
          lagBlocks: lagBlocks?.toString() ?? null,
          confirmations: chainConfirmations,
          expectedBlockTimeMs,
          stallAfterMs,
          stalledForMs,
          status,
          lastObservedAt: lastObservedAt === null ? null : new Date(lastObservedAt).toISOString(),
          lastAdvancedAt: lastAdvancedAt === null ? null : new Date(lastAdvancedAt).toISOString(),
          rpcLatencyMs: rpcLatencies.get(record.chainId) ?? null,
          error: chainError,
          pendingFeed: Boolean(record.wsUrl && config.scoutPendingEnabled)
        }
      }),
      counts: {
        contracts: state.contracts.length,
        tokens: state.tokens.length,
        pools: state.pools.length,
        activePools: state.pools.filter((item) => item.market?.hasLiquidity).length,
        swaps: state.swaps.length,
        pending: state.pending.length,
        walletActivity: state.walletActivity.length,
        deployers: state.deployers.size,
        codeFamilies: state.codeFamilies.size,
        publicLabels: labels.addressIndex.size,
        watchedWallets: watchWallets.size,
        daoCandidates: daoCandidates.length,
        dormantDaoCandidates: daoCandidates.filter((item) => item.dao?.abandonment?.status === 'dormant-candidate').length
      },
      limitation: 'Confirmed contract-creation coverage is continuous from each configured start block only while a durable dedicated RPC/archive service is available. The hot API cache is bounded; the optional NDJSON journal retains the complete emitted event stream. DAO and dormancy classifications are heuristics, not ownership or recoverability findings. Public labels and wallet watches require verifiable public evidence and do not prove beneficial ownership. Pending visibility is best-effort and requires a JSON-RPC provider that exposes pending transactions.'
    }
  }

  async function scanAddress(chainIdInput, addressInput) {
    const chainId = Number(chainIdInput)
    const address = normalizeAddress(addressInput)
    const record = chainById.get(chainId)
    if (!record) throw new Error('Chain is not configured for Scout')
    if (!address) throw new Error('Invalid contract address')

    const [bytecode, blockNumber, nativeBalance, token, implementationRaw, adminRaw, beaconRaw] = await Promise.all([
      record.client.getBytecode({ address }).catch(() => '0x'),
      record.client.getBlockNumber(),
      record.client.getBalance({ address }).catch(() => 0n),
      probeToken(record.client, address),
      record.client.getStorageAt({ address, slot: EIP1967_IMPLEMENTATION_SLOT }).catch(() => undefined),
      record.client.getStorageAt({ address, slot: EIP1967_ADMIN_SLOT }).catch(() => undefined),
      record.client.getStorageAt({ address, slot: EIP1967_BEACON_SLOT }).catch(() => undefined)
    ])
    const runtime = bytecode || '0x'
    const proxy = {
      implementation: storageAddress(implementationRaw),
      admin: storageAddress(adminRaw),
      beacon: storageAddress(beaconRaw)
    }
    const explorer = await blockscoutEvidence(record.explorerUrl, address, token.totalSupply)
    if (!explorer.implementation) explorer.implementation = proxy.implementation
    const analysis = analyzeBytecode(runtime, {
      proxySlots: proxy,
      verified: explorer.verified,
      changedBytecode: explorer.changedBytecode,
      holderConcentration: explorer.holderConcentration
    })
    const daoFingerprint = config.daoIntelligenceEnabled ? analyzeDaoBytecode(runtime) : null
    const indexedContract = contractIndex.get(`${chainId}:${address.toLowerCase()}`) ?? null
    const pools = state.pools.filter((item) => item.chainId === chainId && (item.token0?.toLowerCase() === address.toLowerCase() || item.token1?.toLowerCase() === address.toLowerCase()))
    const poolAddresses = new Set(pools.map((item) => item.pool.toLowerCase()))
    const swaps = state.swaps.filter((item) => item.chainId === chainId && poolAddresses.has(item.pool?.toLowerCase()))
    const activePools = pools.filter((item) => item.market?.hasLiquidity === true)
    const verifiedActivePools = activePools.filter((item) => item.verifiedFactory === true)
    let dao = null
    if (daoFingerprint?.candidate) {
      const probe = await probeDaoContract(record.client, address, daoFingerprint, blockNumber).catch(() => null)
      dao = {
        ...daoFingerprint,
        probe,
        nativeBalanceWei: nativeBalance.toString(),
        abandonment: assessDaoDormancy({
          deployedAt: indexedContract?.timestamp,
          lastActivityAt: indexedContract?.lastActivityTimestamp ?? indexedContract?.timestamp,
          observedCallCount: indexedContract?.observedCallCount ?? 0,
          nativeBalanceWei: nativeBalance.toString(),
          hasLiveLiquidity: activePools.length > 0,
          minAgeDays: config.daoMinimumAgeDays,
          inactiveDays: config.daoInactiveDays,
          lowBalanceWei: config.daoLowNativeBalanceWei
        })
      }
    }
    const proxyPresent = Boolean(proxy.implementation || proxy.admin || proxy.beacon || analysis.findings.some((item) => item.code === 'MINIMAL_PROXY'))
    const reviewReady = Boolean(
      token.tokenLike
      && analysis.score < 30
      && token.paused !== true
      && !proxyPresent
      && verifiedActivePools.length > 0
    )
    return {
      chainId,
      chain: record.name,
      explorerUrl: record.explorerUrl,
      address,
      scannedAt: new Date().toISOString(),
      observedAtBlock: blockNumber.toString(),
      nativeBalanceWei: nativeBalance.toString(),
      codeHash: runtime === '0x' ? `0x${'0'.repeat(64)}` : keccak256(runtime),
      codeSize: Math.max(0, (runtime.length - 2) / 2),
      proxy,
      token: token.tokenLike ? token : null,
      explorer,
      risk: { ...analysis, status: riskStatus(analysis.score) },
      dao,
      indexedContract,
      activity: {
        lastActivityBlock: indexedContract?.lastActivityBlock ?? null,
        lastActivityTimestamp: indexedContract?.lastActivityTimestamp ?? null,
        observedCallCount: indexedContract?.observedCallCount ?? 0,
        observedValueInWei: indexedContract?.observedValueInWei ?? '0'
      },
      market: {
        poolCount: pools.length,
        activePoolCount: activePools.length,
        verifiedActivePoolCount: verifiedActivePools.length,
        observedSwapCount: swaps.length,
        pools: pools.slice(0, 100)
      },
      execution: {
        eligibleForReview: reviewReady,
        autoExecutionAllowed: false,
        blockers: [
          ...(!token.tokenLike ? ['ERC-20 metadata probes did not pass'] : []),
          ...(analysis.score >= 30 ? [`risk score ${analysis.score} is above the review threshold`] : []),
          ...(token.paused === true ? ['token reports paused state'] : []),
          ...(proxyPresent ? ['proxy or implementation indirection is present'] : []),
          ...(verifiedActivePools.length === 0 ? ['no live pool from a configured verified factory'] : [])
        ],
        requiredNextSteps: ['refresh direct-chain state', 'verify route runtime hashes', 'simulate exact calldata', 'review slippage and minimum received', 'obtain explicit wallet signature']
      },
      auditors: [
        { id: 'runtime', status: riskStatus(analysis.score), score: analysis.score, evidence: analysis.findings.slice(0, 20) },
        { id: 'source', status: explorer.verified === true && explorer.changedBytecode !== true ? 'PASS' : 'UNKNOWN', verified: explorer.verified, changedBytecode: explorer.changedBytecode },
        { id: 'control', status: proxyPresent ? 'CAUTION' : 'PASS', proxy, owner: token.owner, paused: token.paused },
        { id: 'liquidity', status: verifiedActivePools.length ? 'PASS' : activePools.length ? 'CAUTION' : 'UNKNOWN', activePools: activePools.length, verifiedActivePools: verifiedActivePools.length, swaps: swaps.length },
        { id: 'governance', status: dao ? dao.confidence.toUpperCase() : 'NOT_DETECTED', roles: dao?.roles ?? [], dormancy: dao?.abandonment ?? null }
      ],
      limitation: 'This multi-chain scan is evidence aggregation, not an audit opinion or safety guarantee. Configured coverage, archive depth, explorer support and factory allowlists determine completeness. It cannot authorize asset recovery, governance takeover or autonomous trading.'
    }
  }

  function deployer(chainId, address) {
    const normalized = normalizeAddress(address)
    if (!normalized) return null
    const record = state.deployers.get(`${Number(chainId)}:${normalized.toLowerCase()}`)
    if (!record) return {
      chainId: Number(chainId),
      address: normalized,
      contracts: 0,
      tokens: 0,
      pools: 0,
      codeHashes: [],
      evidence: addEvidence({ chainId: Number(chainId) }, normalized, 'deployer'),
      deployments: []
    }
    return {
      ...record,
      codeHashes: [...record.codeHashes],
      deployments: state.contracts.filter((item) => item.chainId === Number(chainId) && item.deployer.toLowerCase() === normalized.toLowerCase()).slice(0, 100)
    }
  }

  function codeFamily(hash) {
    return state.codeFamilies.get(String(hash).toLowerCase()) ?? null
  }

  function daos(query = {}) {
    let output = state.contracts.filter((item) => item.dao?.candidate)
    if (query.chainId) output = output.filter((item) => item.chainId === Number(query.chainId))
    if (query.status) output = output.filter((item) => item.dao?.abandonment?.status === String(query.status))
    if (query.role) output = output.filter((item) => item.dao?.roles?.some((role) => role.role === String(query.role)))
    if (query.q) {
      const needle = String(query.q).toLowerCase()
      output = output.filter((item) => JSON.stringify(item).toLowerCase().includes(needle))
    }
    output.sort((left, right) => Number(right.dao?.abandonment?.score ?? 0) - Number(left.dao?.abandonment?.score ?? 0) || Number(blockValue(right) - blockValue(left)))
    return output.slice(0, Math.max(1, Math.min(500, Number(query.limit ?? 100))))
  }

  function dao(chainId, address) {
    const normalized = normalizeAddress(address)
    if (!normalized) return null
    const contract = contractIndex.get(`${Number(chainId)}:${normalized.toLowerCase()}`)
    return contract?.dao?.candidate ? contract : null
  }

  restoreState()

  return {
    start,
    stop,
    poll,
    persist: () => persistState(true),
    onEvent: (listener) => { emitter.on('event', listener); return () => emitter.off('event', listener) },
    summary,
    chains: () => summary().coverage,
    scanAddress,
    contract: (chainId, address) => {
      const normalized = normalizeAddress(address)
      return normalized ? state.contracts.find((item) => item.chainId === Number(chainId) && item.address?.toLowerCase() === normalized.toLowerCase()) ?? null : null
    },
    poolsForToken: (chainId, address) => {
      const normalized = normalizeAddress(address)
      if (!normalized) return []
      const needle = normalized.toLowerCase()
      return state.pools.filter((item) => item.chainId === Number(chainId) && (item.token0?.toLowerCase() === needle || item.token1?.toLowerCase() === needle))
    },
    swapsForPools: (chainId, poolAddresses, limit = 5_000) => {
      const addresses = new Set([...poolAddresses].map((item) => normalizeAddress(item)?.toLowerCase()).filter(Boolean))
      return state.swaps.filter((item) => item.chainId === Number(chainId) && addresses.has(item.pool?.toLowerCase())).slice(0, Math.max(1, Math.min(maxRecords, Number(limit) || 5_000)))
    },
    contracts: (query) => filter(state.contracts, query),
    tokens: (query) => filter(state.tokens, query),
    pools: (query) => filter(state.pools, query),
    swaps: (query) => filter(state.swaps, query),
    pending: (query) => filter(state.pending, query),
    walletActivity: (query) => filter(state.walletActivity, query),
    events: (query) => filter(state.events, query),
    deployer,
    codeFamily,
    daos,
    dao,
    labels: () => ({ entities: labels.entities, indexedAddresses: labels.addressIndex.size, watchedWallets: [...watchWallets.values()] })
  }
}
