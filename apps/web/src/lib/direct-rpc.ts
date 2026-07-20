import {
  getAddress,
  isAddress,
  keccak256,
  parseAbi,
  toBytes,
  toFunctionSelector,
  zeroAddress,
  type Address,
  type PublicClient
} from 'viem'

const ERC20_ABI = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function owner() view returns (address)',
  'function paused() view returns (bool)'
])

const DEX_EVENT_ABI = parseAbi([
  'event PairCreated(address indexed token0,address indexed token1,address pair,uint256)',
  'event PoolCreated(address indexed token0,address indexed token1,uint24 indexed fee,int24 tickSpacing,address pool)'
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

const EIP1967_IMPLEMENTATION_SLOT = slotFor('eip1967.proxy.implementation')
const EIP1967_ADMIN_SLOT = slotFor('eip1967.proxy.admin')
const EIP1967_BEACON_SLOT = slotFor('eip1967.proxy.beacon')

const RISKY_SIGNATURES = [
  ['mint(address,uint256)', 35, 'Privileged mint selector is present.'],
  ['blacklist(address)', 40, 'Blacklist selector is present.'],
  ['setBlacklist(address,bool)', 40, 'Blacklist-management selector is present.'],
  ['setBots(address[],bool)', 32, 'Bot-list selector is present.'],
  ['setSellFee(uint256)', 36, 'Owner-adjustable sell-fee selector is present.'],
  ['setBuyFee(uint256)', 30, 'Owner-adjustable buy-fee selector is present.'],
  ['setFees(uint256,uint256)', 36, 'Owner-adjustable fee selector is present.'],
  ['setTaxFeePercent(uint256)', 30, 'Owner-adjustable transfer-tax selector is present.'],
  ['setTradingEnabled(bool)', 32, 'Privileged trading switch is present.'],
  ['setMaxTxAmount(uint256)', 25, 'Privileged max-transaction selector is present.'],
  ['setMaxWalletSize(uint256)', 22, 'Privileged max-wallet selector is present.'],
  ['pause()', 24, 'Privileged pause selector is present.'],
  ['upgradeTo(address)', 48, 'Upgradeable implementation selector is present.'],
  ['upgradeToAndCall(address,bytes)', 52, 'Upgradeable implementation selector is present.']
] as const

export type DirectTokenMeta = {
  name: string | null
  symbol: string | null
  decimals: number | null
  totalSupply: string | null
  owner: Address | null
  paused: boolean | null
}

export type DirectRiskFinding = { code: string; severity: string; detail: string; signature?: string }

export type DirectScoutContract = {
  chainId: number
  chain: string
  explorerUrl: string | null
  address: Address
  deployer: Address
  transactionHash: `0x${string}`
  blockNumber: string
  timestamp: number | null
  codeHash: string
  codeSize: number
  risk: { status: 'TRUSTED' | 'LOW' | 'CAUTION' | 'DANGER' | 'BLOCKED'; score: number; findings: DirectRiskFinding[] }
  token: DirectTokenMeta | null
  evidence: Array<{ type: string; source: string; confidence: string; entityName?: string }>
}

export type DirectScoutPool = {
  chainId: number
  chain: string
  explorerUrl: string | null
  standard: 'uniswap-v2' | 'uniswap-v3'
  factory: Address
  factoryName: null
  verifiedFactory: false
  token0: Address
  token1: Address
  token0Meta: DirectTokenMeta | null
  token1Meta: DirectTokenMeta | null
  pool: Address
  fee: number | null
  transactionHash: `0x${string}`
  blockNumber: string
  timestamp: number | null
  swapCount: number
  lastSwapAt: null
  market: {
    kind: 'v2-reserves' | 'v3-liquidity'
    reserve0: string | null
    reserve1: string | null
    totalSupply: string | null
    liquidity: string | null
    sqrtPriceX96: string | null
    tick: number | null
    price1Per0: string | null
    price0Per1: string | null
    hasLiquidity: boolean
    observedAtBlock: string
    updatedAt: string
    error?: string
  }
  evidence: Array<{ type: string; source: string; confidence: string }>
}

export type DirectScanResult = {
  address: Address
  scannedAt: string
  status: 'TRUSTED' | 'LOW' | 'CAUTION' | 'DANGER' | 'BLOCKED'
  score: number
  codeHash: string
  tradeAllowed: false
  metadata: DirectTokenMeta
  proxy: { implementation?: Address; admin?: Address; beacon?: Address }
  explorer: {
    verified: boolean | null
    changedBytecode: boolean | null
    implementation: Address | null
    holdersCount: string | null
    transfersCount: string | null
    holderConcentration: number | null
  }
  registry: null
  findings: DirectRiskFinding[]
  limitation: string
}

export type DirectNetworkState = {
  chainId: number
  network: string
  blockNumber: string
  gasPriceWei: string
  configured: boolean
  productionTradingEnabled: false
}

function slotFor(label: string): `0x${string}` {
  const value = BigInt(keccak256(toBytes(label))) - 1n
  return `0x${value.toString(16).padStart(64, '0')}`
}

function storageAddress(value: string | undefined): Address | undefined {
  if (!value || value === '0x' || BigInt(value) === 0n) return undefined
  const candidate = `0x${value.slice(-40)}`
  return isAddress(candidate) ? getAddress(candidate) : undefined
}

async function safeRead<T>(promise: Promise<T>): Promise<T | undefined> {
  try { return await promise } catch { return undefined }
}

async function mapLimit<T, R>(items: readonly T[], concurrency: number, mapper: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const output = new Array<R>(items.length)
  let cursor = 0
  async function worker() {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      output[index] = await mapper(items[index]!, index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(Math.max(1, concurrency), items.length || 1) }, () => worker()))
  return output
}

function statusFor(score: number): DirectScoutContract['risk']['status'] {
  if (score >= 90) return 'BLOCKED'
  if (score >= 65) return 'DANGER'
  if (score >= 30) return 'CAUTION'
  return 'LOW'
}

function boundText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const result = value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max)
  return result || null
}

function analyzeRuntime(code: `0x${string}`, proxy: DirectScanResult['proxy'] = {}) {
  const findings: DirectRiskFinding[] = []
  let score = 0
  if (code === '0x' || code.length <= 4) {
    return { score: 100, status: 'BLOCKED' as const, findings: [{ code: 'NO_RUNTIME_CODE', severity: 'critical', detail: 'Address has no runtime bytecode.' }] }
  }
  const normalized = code.toLowerCase()
  const minimalProxy = /^0x363d3d373d3d3d363d73[0-9a-f]{40}5af43d82803e903d91602b57fd5bf3$/.test(normalized)
    || (normalized.includes('363d3d373d3d3d363d73') && normalized.includes('5af43d82803e903d91602b57fd5bf3'))
  if (minimalProxy) {
    score += 75
    findings.push({ code: 'MINIMAL_PROXY', severity: 'high', detail: 'EIP-1167-style delegate proxy detected.' })
  }
  if (proxy.implementation) {
    score += 50
    findings.push({ code: 'EIP1967_IMPLEMENTATION', severity: 'high', detail: `EIP-1967 implementation slot points to ${proxy.implementation}.` })
  }
  if (proxy.beacon) {
    score += 55
    findings.push({ code: 'EIP1967_BEACON', severity: 'high', detail: `EIP-1967 beacon slot points to ${proxy.beacon}.` })
  }
  if (proxy.admin) {
    score += 20
    findings.push({ code: 'EIP1967_ADMIN', severity: 'medium', detail: `EIP-1967 admin slot points to ${proxy.admin}.` })
  }
  for (const [signature, weight, detail] of RISKY_SIGNATURES) {
    const selector = toFunctionSelector(signature).slice(2).toLowerCase()
    if (!normalized.includes(selector)) continue
    score += weight
    findings.push({ code: 'PRIVILEGED_SELECTOR', severity: weight >= 36 ? 'high' : 'medium', detail, signature })
  }
  score = Math.min(100, score)
  return { score, status: statusFor(score), findings }
}

export async function readDirectNetwork(client: PublicClient, network: string, configured: boolean): Promise<DirectNetworkState> {
  const [chainId, blockNumber, gasPrice] = await Promise.all([
    client.getChainId(),
    client.getBlockNumber(),
    client.getGasPrice().catch(() => 0n)
  ])
  return { chainId, network, blockNumber: blockNumber.toString(), gasPriceWei: gasPrice.toString(), configured, productionTradingEnabled: false }
}

export async function probeErc20(client: PublicClient, address: Address): Promise<DirectTokenMeta | null> {
  const [name, symbol, decimals, totalSupply, owner, paused] = await Promise.all([
    safeRead(client.readContract({ address, abi: ERC20_ABI, functionName: 'name' })),
    safeRead(client.readContract({ address, abi: ERC20_ABI, functionName: 'symbol' })),
    safeRead(client.readContract({ address, abi: ERC20_ABI, functionName: 'decimals' })),
    safeRead(client.readContract({ address, abi: ERC20_ABI, functionName: 'totalSupply' })),
    safeRead(client.readContract({ address, abi: ERC20_ABI, functionName: 'owner' })),
    safeRead(client.readContract({ address, abi: ERC20_ABI, functionName: 'paused' }))
  ])
  if (typeof decimals !== 'number' || typeof totalSupply !== 'bigint') return null
  return {
    name: boundText(name, 96),
    symbol: boundText(symbol, 24),
    decimals,
    totalSupply: totalSupply.toString(),
    owner: typeof owner === 'string' && isAddress(owner) ? getAddress(owner) : null,
    paused: typeof paused === 'boolean' ? paused : null
  }
}

export async function scanRecentDeployments(
  client: PublicClient,
  options: { chainId: number; chain: string; explorerUrl?: string | null; lookback?: number; maxContracts?: number; fromBlock?: bigint; toBlock?: bigint }
): Promise<DirectScoutContract[]> {
  const lookback = Math.max(1, Math.min(100, options.lookback ?? 100))
  const maxContracts = Math.max(1, Math.min(150, options.maxContracts ?? 100))
  const observedHead = options.toBlock ?? await client.getBlockNumber()
  const requestedStart = options.fromBlock ?? (observedHead >= BigInt(lookback - 1) ? observedHead - BigInt(lookback - 1) : 0n)
  const start = requestedStart > observedHead ? observedHead : requestedStart
  const span = observedHead - start + 1n
  if (span > 100n) throw new Error('Direct deployment scan is limited to 100 blocks per request')
  const blockNumbers = Array.from({ length: Number(span) }, (_, index) => start + BigInt(index))
  const blocks = await mapLimit(blockNumbers, 4, async (blockNumber) => client.getBlock({ blockNumber, includeTransactions: true }).catch(() => null))
  const creations: Array<{ from: Address; hash: `0x${string}`; blockNumber: bigint; timestamp: bigint }> = []
  for (const chainBlock of blocks) {
    if (!chainBlock) continue
    for (const tx of chainBlock.transactions) {
      if (typeof tx === 'string' || tx.to !== null) continue
      creations.push({ from: getAddress(tx.from), hash: tx.hash, blockNumber: chainBlock.number, timestamp: chainBlock.timestamp })
      if (creations.length >= maxContracts) break
    }
    if (creations.length >= maxContracts) break
  }
  const records = await mapLimit(creations, 4, async (creation) => {
    const receipt = await client.getTransactionReceipt({ hash: creation.hash }).catch(() => null)
    if (!receipt?.contractAddress) return null
    const address = getAddress(receipt.contractAddress)
    const code = await client.getBytecode({ address }).catch(() => undefined)
    if (!code || code === '0x') return null
    const token = await probeErc20(client, address)
    const risk = analyzeRuntime(code)
    const result: DirectScoutContract = {
      chainId: options.chainId,
      chain: options.chain,
      explorerUrl: options.explorerUrl ?? null,
      address,
      deployer: creation.from,
      transactionHash: creation.hash,
      blockNumber: creation.blockNumber.toString(),
      timestamp: Number(creation.timestamp),
      codeHash: keccak256(code),
      codeSize: (code.length - 2) / 2,
      risk,
      token,
      evidence: [{ type: 'direct-rpc', source: 'eth_getBlockByNumber + eth_getTransactionReceipt + eth_getCode', confidence: 'direct-chain', entityName: 'Direct RPC fallback' }]
    }
    return result
  })
  return records.flatMap((item) => item ? [item] : []).sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber))
}

async function fetchBoundedJson(url: string, maxBytes = 500_000): Promise<unknown> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 5_000)
  try {
    const response = await fetch(url, { headers: { accept: 'application/json' }, signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error' })
    if (!response.ok) return undefined
    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.toLowerCase().includes('application/json')) return undefined
    const text = await response.text()
    if (text.length > maxBytes) return undefined
    return JSON.parse(text) as unknown
  } catch { return undefined } finally { window.clearTimeout(timer) }
}

function safeExplorerApiBase(explorerUrl?: string | null): string | null {
  if (!explorerUrl) return null
  try {
    const url = new URL(explorerUrl)
    if (url.protocol !== 'https:' || url.username || url.password) return null
    return url.origin
  } catch { return null }
}

async function explorerEvidence(explorerUrl: string | null | undefined, address: Address, totalSupply: bigint | undefined) {
  const base = safeExplorerApiBase(explorerUrl)
  if (!base) return { verified: null, implementation: null, holderConcentration: null, holdersCount: null }
  const sourceUrl = `${base}/api?module=contract&action=getsourcecode&address=${encodeURIComponent(address)}`
  const holdersUrl = `${base}/api?module=token&action=getTokenHolders&contractaddress=${encodeURIComponent(address)}&page=1&offset=20`
  const [sourceRaw, holdersRaw] = await Promise.all([fetchBoundedJson(sourceUrl), fetchBoundedJson(holdersUrl)])
  let verified: boolean | null = null
  let implementation: Address | null = null
  if (sourceRaw && typeof sourceRaw === 'object' && !Array.isArray(sourceRaw)) {
    const result = (sourceRaw as Record<string, unknown>).result
    const row = Array.isArray(result) ? result[0] : result
    if (row && typeof row === 'object' && !Array.isArray(row)) {
      const record = row as Record<string, unknown>
      const source = typeof record.SourceCode === 'string' ? record.SourceCode.trim() : ''
      verified = Boolean(source)
      if (typeof record.ImplementationAddress === 'string' && isAddress(record.ImplementationAddress)) implementation = getAddress(record.ImplementationAddress)
    }
  }
  let holderConcentration: number | null = null
  let holdersCount: string | null = null
  if (holdersRaw && typeof holdersRaw === 'object' && !Array.isArray(holdersRaw)) {
    const result = (holdersRaw as Record<string, unknown>).result
    if (Array.isArray(result)) {
      holdersCount = String(result.length)
      if (totalSupply && totalSupply > 0n) {
        const top = result.slice(0, 10).reduce((sum, item) => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) return sum
          const value = (item as Record<string, unknown>).value
          return typeof value === 'string' && /^\d+$/.test(value) ? sum + BigInt(value) : sum
        }, 0n)
        holderConcentration = Number((top * 1_000_000n) / totalSupply) / 1_000_000
      }
    }
  }
  return { verified, implementation, holderConcentration, holdersCount }
}

function decimalRatio(numerator: bigint, denominator: bigint, precision = 10): string | null {
  if (denominator === 0n) return null
  const scale = 10n ** BigInt(precision)
  const scaled = numerator * scale / denominator
  const whole = scaled / scale
  const fraction = (scaled % scale).toString().padStart(precision, '0').replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : whole.toString()
}

export async function scanRecentPools(
  client: PublicClient,
  options: { chainId: number; chain: string; explorerUrl?: string | null; lookback?: number; fromBlock?: bigint; toBlock?: bigint }
): Promise<DirectScoutPool[]> {
  const lookback = Math.max(1, Math.min(100, options.lookback ?? 100))
  const observedHead = options.toBlock ?? await client.getBlockNumber()
  const requestedStart = options.fromBlock ?? (observedHead >= BigInt(lookback - 1) ? observedHead - BigInt(lookback - 1) : 0n)
  const start = requestedStart > observedHead ? observedHead : requestedStart
  if (observedHead - start + 1n > 100n) throw new Error('Direct pool scan is limited to 100 blocks per request')
  const logs = await client.getLogs({ events: DEX_EVENT_ABI, strict: false, fromBlock: start, toBlock: observedHead }).catch(() => [])
  const rows = await mapLimit(logs.slice(0, 150), 4, async (log): Promise<DirectScoutPool | null> => {
    try {
      const eventName = 'eventName' in log ? String(log.eventName) : ''
      const args = ('args' in log ? log.args : {}) as Record<string, unknown>
      const token0 = typeof args.token0 === 'string' && isAddress(args.token0) ? getAddress(args.token0) : null
      const token1 = typeof args.token1 === 'string' && isAddress(args.token1) ? getAddress(args.token1) : null
      const candidate = args.pair ?? args.pool
      const pool = typeof candidate === 'string' && isAddress(candidate) ? getAddress(candidate) : null
      if (!token0 || !token1 || !pool || !log.transactionHash || log.blockNumber === null) return null
      const [token0Meta, token1Meta, block] = await Promise.all([
        probeErc20(client, token0), probeErc20(client, token1), client.getBlock({ blockNumber: log.blockNumber }).catch(() => null)
      ])
      const decimals0 = token0Meta?.decimals ?? 18
      const decimals1 = token1Meta?.decimals ?? 18
      const evidence = [{ type: 'direct-rpc', source: 'bounded browser RPC event and pool-state read', confidence: 'medium' }]
      if (eventName === 'PairCreated') {
        const [actual0, actual1, reserves, totalSupply] = await Promise.all([
          client.readContract({ address: pool, abi: V2_PAIR_ABI, functionName: 'token0' }),
          client.readContract({ address: pool, abi: V2_PAIR_ABI, functionName: 'token1' }),
          client.readContract({ address: pool, abi: V2_PAIR_ABI, functionName: 'getReserves' }),
          client.readContract({ address: pool, abi: V2_PAIR_ABI, functionName: 'totalSupply' })
        ])
        if (actual0.toLowerCase() !== token0.toLowerCase() || actual1.toLowerCase() !== token1.toLowerCase()) return null
        const reserve0 = BigInt(reserves[0]), reserve1 = BigInt(reserves[1])
        return { chainId: options.chainId, chain: options.chain, explorerUrl: options.explorerUrl ?? null, standard: 'uniswap-v2', factory: getAddress(log.address), factoryName: null, verifiedFactory: false, token0, token1, token0Meta, token1Meta, pool, fee: null, transactionHash: log.transactionHash, blockNumber: log.blockNumber.toString(), timestamp: block ? Number(block.timestamp) : null, swapCount: 0, lastSwapAt: null,
          market: { kind: 'v2-reserves', reserve0: reserve0.toString(), reserve1: reserve1.toString(), totalSupply: BigInt(totalSupply).toString(), liquidity: null, sqrtPriceX96: null, tick: null, price1Per0: decimalRatio(reserve1 * 10n ** BigInt(decimals0), reserve0 * 10n ** BigInt(decimals1)), price0Per1: decimalRatio(reserve0 * 10n ** BigInt(decimals1), reserve1 * 10n ** BigInt(decimals0)), hasLiquidity: reserve0 > 0n && reserve1 > 0n && BigInt(totalSupply) > 0n, observedAtBlock: observedHead.toString(), updatedAt: new Date().toISOString() }, evidence }
      }
      const [actual0, actual1, fee, liquidity, slot0] = await Promise.all([
        client.readContract({ address: pool, abi: V3_POOL_ABI, functionName: 'token0' }),
        client.readContract({ address: pool, abi: V3_POOL_ABI, functionName: 'token1' }),
        client.readContract({ address: pool, abi: V3_POOL_ABI, functionName: 'fee' }),
        client.readContract({ address: pool, abi: V3_POOL_ABI, functionName: 'liquidity' }),
        client.readContract({ address: pool, abi: V3_POOL_ABI, functionName: 'slot0' })
      ])
      if (actual0.toLowerCase() !== token0.toLowerCase() || actual1.toLowerCase() !== token1.toLowerCase()) return null
      const sqrtPriceX96 = BigInt(slot0[0])
      const numerator = sqrtPriceX96 * sqrtPriceX96 * 10n ** BigInt(decimals0)
      const denominator = (1n << 192n) * 10n ** BigInt(decimals1)
      return { chainId: options.chainId, chain: options.chain, explorerUrl: options.explorerUrl ?? null, standard: 'uniswap-v3', factory: getAddress(log.address), factoryName: null, verifiedFactory: false, token0, token1, token0Meta, token1Meta, pool, fee: Number(fee), transactionHash: log.transactionHash, blockNumber: log.blockNumber.toString(), timestamp: block ? Number(block.timestamp) : null, swapCount: 0, lastSwapAt: null,
        market: { kind: 'v3-liquidity', reserve0: null, reserve1: null, totalSupply: null, liquidity: BigInt(liquidity).toString(), sqrtPriceX96: sqrtPriceX96.toString(), tick: Number(slot0[1]), price1Per0: decimalRatio(numerator, denominator), price0Per1: decimalRatio(denominator, numerator), hasLiquidity: BigInt(liquidity) > 0n && sqrtPriceX96 > 0n, observedAtBlock: observedHead.toString(), updatedAt: new Date().toISOString() }, evidence }
    } catch { return null }
  })
  const unique = new Map(rows.filter((item): item is DirectScoutPool => item !== null).map((item) => [item.pool.toLowerCase(), item]))
  return [...unique.values()].sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber))
}

export async function scanTokenDirect(client: PublicClient, addressInput: string, explorerUrl?: string | null): Promise<DirectScanResult> {
  if (!isAddress(addressInput)) throw new Error('Invalid token address')
  const address = getAddress(addressInput)
  const code = await client.getBytecode({ address })
  const runtime = code ?? '0x'
  const [implementationRaw, adminRaw, beaconRaw, token] = await Promise.all([
    client.getStorageAt({ address, slot: EIP1967_IMPLEMENTATION_SLOT }).catch(() => undefined),
    client.getStorageAt({ address, slot: EIP1967_ADMIN_SLOT }).catch(() => undefined),
    client.getStorageAt({ address, slot: EIP1967_BEACON_SLOT }).catch(() => undefined),
    probeErc20(client, address)
  ])
  const proxy = {
    implementation: storageAddress(implementationRaw),
    admin: storageAddress(adminRaw),
    beacon: storageAddress(beaconRaw)
  }
  const analysis = analyzeRuntime(runtime, proxy)
  const totalSupply = token?.totalSupply ? BigInt(token.totalSupply) : undefined
  const external = await explorerEvidence(explorerUrl, address, totalSupply)
  const findings = [...analysis.findings]
  let score = analysis.score
  if (external.verified === false) {
    score = Math.min(100, score + 18)
    findings.push({ code: 'UNVERIFIED_SOURCE', severity: 'medium', detail: 'Block explorer did not return verified source metadata.' })
  }
  if (external.holderConcentration !== null && external.holderConcentration >= 0.9) {
    score = Math.min(100, score + 24)
    findings.push({ code: 'EXTREME_CONCENTRATION', severity: 'high', detail: `Top sampled holders control ${(external.holderConcentration * 100).toFixed(1)}% of supply.` })
  } else if (external.holderConcentration !== null && external.holderConcentration >= 0.65) {
    score = Math.min(100, score + 12)
    findings.push({ code: 'HIGH_CONCENTRATION', severity: 'medium', detail: `Top sampled holders control ${(external.holderConcentration * 100).toFixed(1)}% of supply.` })
  }
  if (!token) {
    score = Math.max(score, 85)
    findings.push({ code: 'ERC20_PROBE_FAILED', severity: 'high', detail: 'Standard ERC-20 metadata probes did not complete.' })
  }
  const metadata: DirectTokenMeta = token ?? { name: null, symbol: null, decimals: null, totalSupply: null, owner: null, paused: null }
  return {
    address,
    scannedAt: new Date().toISOString(),
    status: statusFor(score),
    score,
    codeHash: runtime === '0x' ? `0x${'0'.repeat(64)}` : keccak256(runtime),
    tradeAllowed: false,
    metadata,
    proxy,
    explorer: { verified: external.verified, changedBytecode: null, implementation: external.implementation ?? proxy.implementation ?? null, holdersCount: external.holdersCount, transfersCount: null, holderConcentration: external.holderConcentration },
    registry: null,
    findings,
    limitation: 'Direct-RPC fallback provides bounded bytecode, proxy-slot, ERC-20 and optional Blockscout evidence. It does not prove honeypot-free execution, locked liquidity, beneficial ownership or protocol approval.'
  }
}

export function directScoutSummary(records: DirectScoutContract[], chainId: number, chain: string, head: string, pollIntervalMs: number, pools: DirectScoutPool[] = []) {
  return {
    enabled: true,
    running: true,
    startedAt: new Date().toISOString(),
    lastError: null,
    pollIntervalMs,
    coverage: [{ chainId, name: chain, explorerUrl: null, rpc: 'direct browser RPC', head, observedHead: head, safeHead: head, startBlock: null, lagBlocks: '0', pendingFeed: false }],
    counts: {
      contracts: records.length,
      tokens: records.filter((item) => item.token).length,
      pools: pools.length,
      activePools: pools.filter((item) => item.market.hasLiquidity).length,
      swaps: 0,
      pending: 0,
      walletActivity: 0,
      deployers: new Set(records.map((item) => item.deployer.toLowerCase())).size,
      codeFamilies: new Set(records.map((item) => item.codeHash.toLowerCase())).size,
      publicLabels: 0,
      watchedWallets: 0
    },
    statePersistence: false,
    journalEnabled: false,
    confirmations: 0,
    reorgRewind: 0,
    limitation: 'Direct fallback scans at most the latest 100 blocks and does not replace a durable reorg-aware indexer or archive provider.'
  }
}

export function directRadarScore(item: DirectScoutContract) {
  const ageMinutes = item.timestamp ? Math.max(0, Math.floor((Date.now() / 1000 - item.timestamp) / 60)) : null
  const safety = Math.max(0, 100 - item.risk.score)
  const freshness = ageMinutes === null ? 0 : Math.max(0, 100 - Math.min(100, ageMinutes * 2))
  const provenance = item.codeHash ? 20 : 0
  const overall = Math.round(safety * 0.65 + freshness * 0.25 + provenance * 0.1)
  return { overall, safety, freshness, provenance, liquidity: 0, traction: 0 }
}

export function isDirectRpcCandidateTradable(item: DirectScoutContract): boolean {
  return Boolean(item.token && item.address !== zeroAddress && item.risk.score < 65)
}
