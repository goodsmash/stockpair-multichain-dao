import {
  decodeFunctionResult,
  encodeFunctionData,
  getAddress,
  isAddress,
  keccak256,
  parseAbi,
  zeroAddress,
  type Address,
  type PublicClient
} from 'viem'
import { isRecord, safeAddress, safeHash, safeInteger } from './security'

export const v2FactoryAbi = parseAbi(['function getPair(address tokenA,address tokenB) view returns (address pair)'])
export const v2PairAbi = parseAbi([
  'function factory() view returns (address)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function getReserves() view returns (uint112 reserve0,uint112 reserve1,uint32 blockTimestampLast)'
])
export const v2RouterAbi = parseAbi([
  'function getAmountsOut(uint256 amountIn,address[] path) view returns (uint256[] amounts)',
  'function swapExactETHForTokens(uint256 amountOutMin,address[] path,address to,uint256 deadline) payable returns (uint256[] amounts)',
  'function swapExactTokensForETH(uint256 amountIn,uint256 amountOutMin,address[] path,address to,uint256 deadline) returns (uint256[] amounts)'
])
export const v3FactoryAbi = parseAbi(['function getPool(address tokenA,address tokenB,uint24 fee) view returns (address pool)'])
export const v3PoolAbi = parseAbi([
  'function factory() view returns (address)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function fee() view returns (uint24)',
  'function liquidity() view returns (uint128)',
  'function slot0() view returns (uint160 sqrtPriceX96,int24 tick,uint16 observationIndex,uint16 observationCardinality,uint16 observationCardinalityNext,uint8 feeProtocol,bool unlocked)'
])
export const v3QuoterV1Abi = parseAbi(['function quoteExactInputSingle(address tokenIn,address tokenOut,uint24 fee,uint256 amountIn,uint160 sqrtPriceLimitX96) returns (uint256 amountOut)'])
export const v3QuoterV2Abi = parseAbi(['function quoteExactInputSingle((address tokenIn,address tokenOut,uint256 amountIn,uint24 fee,uint160 sqrtPriceLimitX96) params) returns (uint256 amountOut,uint160 sqrtPriceX96After,uint32 initializedTicksCrossed,uint256 gasEstimate)'])
export const v3RouterAbi = parseAbi([
  'function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96) params) payable returns (uint256 amountOut)',
  'function unwrapWETH9(uint256 amountMinimum,address recipient) payable',
  'function multicall(bytes[] data) payable returns (bytes[] results)'
])

export type DexAdapter = {
  id: string
  name: string
  kind: 'v2' | 'v3'
  chainId: number
  factory: Address
  factoryCodeHash: string
  router: Address
  routerCodeHash: string
  wrappedNative: Address
  wrappedNativeCodeHash: string
  pairCodeHash?: string
  poolCodeHash?: string
  quoter?: Address
  quoterCodeHash?: string
  quoterVariant?: 'v1' | 'v2'
  fees: number[]
  enabled: boolean
}

export type DexQuote = {
  adapterId: string
  adapterName: string
  kind: 'v2' | 'v3'
  router: Address
  pool: Address
  wrappedNative: Address
  token: Address
  tokenIn: Address
  tokenOut: Address
  direction: 'buy' | 'sell'
  amountIn: bigint
  amountOut: bigint
  minimumOut: bigint
  slippageBps: number
  priceImpactBps: number | null
  fee: number | null
  path: Address[]
  verifiedAtBlock: bigint
}

function boundedId(value: unknown, fallback: string): string {
  const text = typeof value === 'string' ? value.replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 64) : ''
  return text || fallback
}

function requiredHash(value: unknown): string | null {
  const hash = safeHash(value)
  return hash && !/^0x0{64}$/.test(hash) ? hash : null
}

export function parseDexAdapters(raw: unknown, chainId: number): DexAdapter[] {
  let parsed: unknown = raw
  if (typeof raw === 'string') {
    if (!raw.trim()) return []
    try { parsed = JSON.parse(raw) as unknown } catch { return [] }
  }
  const rows = Array.isArray(parsed) ? parsed : isRecord(parsed) && Array.isArray(parsed.adapters) ? parsed.adapters : []
  const output: DexAdapter[] = []
  for (const [index, value] of rows.entries()) {
    if (!isRecord(value) || value.enabled === false) continue
    const kind = value.kind === 'v2' || value.kind === 'v3' ? value.kind : null
    const adapterChainId = safeInteger(value.chainId, 0, 1)
    const factory = safeAddress(value.factory)
    const router = safeAddress(value.router)
    const wrappedNative = safeAddress(value.wrappedNative)
    const factoryCodeHash = requiredHash(value.factoryCodeHash)
    const routerCodeHash = requiredHash(value.routerCodeHash)
    const wrappedNativeCodeHash = requiredHash(value.wrappedNativeCodeHash)
    if (!kind || adapterChainId !== chainId || !factory || !router || !wrappedNative || !factoryCodeHash || !routerCodeHash || !wrappedNativeCodeHash) continue
    const base: DexAdapter = {
      id: boundedId(value.id, `dex-${index}`),
      name: typeof value.name === 'string' ? value.name.slice(0, 80) : `${kind.toUpperCase()} adapter`,
      kind,
      chainId: adapterChainId,
      factory,
      factoryCodeHash,
      router,
      routerCodeHash,
      wrappedNative,
      wrappedNativeCodeHash,
      pairCodeHash: requiredHash(value.pairCodeHash) ?? undefined,
      poolCodeHash: requiredHash(value.poolCodeHash) ?? undefined,
      fees: Array.isArray(value.fees) ? [...new Set(value.fees.map((fee) => safeInteger(fee, 0, 1, 1_000_000)).filter(Boolean))].slice(0, 12) : [500, 3000, 10000],
      enabled: true
    }
    if (kind === 'v2' && !base.pairCodeHash) continue
    if (kind === 'v3') {
      const quoter = safeAddress(value.quoter)
      const quoterCodeHash = requiredHash(value.quoterCodeHash)
      if (!quoter || !quoterCodeHash || !base.poolCodeHash) continue
      base.quoter = quoter
      base.quoterCodeHash = quoterCodeHash
      base.quoterVariant = value.quoterVariant === 'v2' ? 'v2' : 'v1'
    }
    output.push(base)
  }
  return output
}

async function verifyCodeHash(client: PublicClient, address: Address, expected: string, label: string) {
  const code = await client.getBytecode({ address })
  if (!code || code === '0x') throw new Error(`${label} has no runtime bytecode`)
  const actual = keccak256(code).toLowerCase()
  if (actual !== expected.toLowerCase()) throw new Error(`${label} runtime hash is not pinned to this build`)
}

export async function verifyDexAdapter(client: PublicClient, adapter: DexAdapter) {
  await Promise.all([
    verifyCodeHash(client, adapter.factory, adapter.factoryCodeHash, `${adapter.name} factory`),
    verifyCodeHash(client, adapter.router, adapter.routerCodeHash, `${adapter.name} router`),
    verifyCodeHash(client, adapter.wrappedNative, adapter.wrappedNativeCodeHash, 'Wrapped native token'),
    adapter.quoter && adapter.quoterCodeHash ? verifyCodeHash(client, adapter.quoter, adapter.quoterCodeHash, `${adapter.name} quoter`) : Promise.resolve()
  ])
}

function impactBps(spotOut: bigint, quotedOut: bigint): number | null {
  if (spotOut <= 0n || quotedOut <= 0n || quotedOut >= spotOut) return quotedOut >= spotOut && quotedOut > 0n ? 0 : null
  return Number(((spotOut - quotedOut) * 10_000n) / spotOut)
}

async function quoteV2(client: PublicClient, adapter: DexAdapter, token: Address, amountIn: bigint, direction: 'buy' | 'sell', slippageBps: number): Promise<DexQuote | null> {
  const pair = await client.readContract({ address: adapter.factory, abi: v2FactoryAbi, functionName: 'getPair', args: [adapter.wrappedNative, token] })
  if (pair === zeroAddress) return null
  const pool = getAddress(pair)
  if (adapter.pairCodeHash) await verifyCodeHash(client, pool, adapter.pairCodeHash, `${adapter.name} pair`)
  const [pairFactory, token0, token1, reserves, amounts, block] = await Promise.all([
    client.readContract({ address: pool, abi: v2PairAbi, functionName: 'factory' }),
    client.readContract({ address: pool, abi: v2PairAbi, functionName: 'token0' }),
    client.readContract({ address: pool, abi: v2PairAbi, functionName: 'token1' }),
    client.readContract({ address: pool, abi: v2PairAbi, functionName: 'getReserves' }),
    client.readContract({ address: adapter.router, abi: v2RouterAbi, functionName: 'getAmountsOut', args: [amountIn, direction === 'buy' ? [adapter.wrappedNative, token] : [token, adapter.wrappedNative]] }),
    client.getBlockNumber()
  ])
  if (pairFactory.toLowerCase() !== adapter.factory.toLowerCase()) throw new Error(`${adapter.name} pair factory mismatch`)
  const validPair = (token0.toLowerCase() === adapter.wrappedNative.toLowerCase() && token1.toLowerCase() === token.toLowerCase())
    || (token1.toLowerCase() === adapter.wrappedNative.toLowerCase() && token0.toLowerCase() === token.toLowerCase())
  if (!validPair) throw new Error(`${adapter.name} pair token mismatch`)
  const amountOut = amounts.at(-1) ?? 0n
  if (amountOut <= 0n) return null
  const wrappedIs0 = token0.toLowerCase() === adapter.wrappedNative.toLowerCase()
  const reserveWrapped = wrappedIs0 ? reserves[0] : reserves[1]
  const reserveToken = wrappedIs0 ? reserves[1] : reserves[0]
  const reserveIn = direction === 'buy' ? reserveWrapped : reserveToken
  const reserveOut = direction === 'buy' ? reserveToken : reserveWrapped
  const spotOut = reserveIn > 0n ? amountIn * reserveOut / reserveIn : 0n
  return {
    adapterId: adapter.id,
    adapterName: adapter.name,
    kind: 'v2',
    router: adapter.router,
    pool,
    wrappedNative: adapter.wrappedNative,
    token,
    tokenIn: direction === 'buy' ? adapter.wrappedNative : token,
    tokenOut: direction === 'buy' ? token : adapter.wrappedNative,
    direction,
    amountIn,
    amountOut,
    minimumOut: amountOut * BigInt(10_000 - slippageBps) / 10_000n,
    slippageBps,
    priceImpactBps: impactBps(spotOut, amountOut),
    fee: null,
    path: direction === 'buy' ? [adapter.wrappedNative, token] : [token, adapter.wrappedNative],
    verifiedAtBlock: block
  }
}

async function quoteV3Quoter(client: PublicClient, adapter: DexAdapter, tokenIn: Address, tokenOut: Address, fee: number, amountIn: bigint): Promise<bigint> {
  if (!adapter.quoter) return 0n
  if (adapter.quoterVariant === 'v2') {
    const data = encodeFunctionData({ abi: v3QuoterV2Abi, functionName: 'quoteExactInputSingle', args: [{ tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0n }] })
    const result = await client.call({ to: adapter.quoter, data }).catch(() => null)
    if (!result?.data) return 0n
    const decoded = decodeFunctionResult({ abi: v3QuoterV2Abi, functionName: 'quoteExactInputSingle', data: result.data })
    return decoded[0]
  }
  const data = encodeFunctionData({ abi: v3QuoterV1Abi, functionName: 'quoteExactInputSingle', args: [tokenIn, tokenOut, fee, amountIn, 0n] })
  const result = await client.call({ to: adapter.quoter, data }).catch(() => null)
  if (!result?.data) return 0n
  return decodeFunctionResult({ abi: v3QuoterV1Abi, functionName: 'quoteExactInputSingle', data: result.data })
}

async function quoteV3(client: PublicClient, adapter: DexAdapter, token: Address, amountIn: bigint, direction: 'buy' | 'sell', slippageBps: number): Promise<DexQuote | null> {
  const tokenIn = direction === 'buy' ? adapter.wrappedNative : token
  const tokenOut = direction === 'buy' ? token : adapter.wrappedNative
  const candidates: DexQuote[] = []
  for (const fee of adapter.fees) {
    const poolAddress = await client.readContract({ address: adapter.factory, abi: v3FactoryAbi, functionName: 'getPool', args: [adapter.wrappedNative, token, fee] }).catch(() => zeroAddress)
    if (poolAddress === zeroAddress) continue
    const pool = getAddress(poolAddress)
    if (!adapter.poolCodeHash) throw new Error(`${adapter.name} V3 pool runtime hash is not configured`)
    await verifyCodeHash(client, pool, adapter.poolCodeHash, `${adapter.name} pool`)
    const [factory, token0, token1, poolFee, liquidity, slot0, amountOut, block] = await Promise.all([
      client.readContract({ address: pool, abi: v3PoolAbi, functionName: 'factory' }),
      client.readContract({ address: pool, abi: v3PoolAbi, functionName: 'token0' }),
      client.readContract({ address: pool, abi: v3PoolAbi, functionName: 'token1' }),
      client.readContract({ address: pool, abi: v3PoolAbi, functionName: 'fee' }),
      client.readContract({ address: pool, abi: v3PoolAbi, functionName: 'liquidity' }),
      client.readContract({ address: pool, abi: v3PoolAbi, functionName: 'slot0' }),
      quoteV3Quoter(client, adapter, tokenIn, tokenOut, fee, amountIn),
      client.getBlockNumber()
    ])
    if (factory.toLowerCase() !== adapter.factory.toLowerCase() || Number(poolFee) !== fee || liquidity <= 0n) continue
    const validPair = (token0.toLowerCase() === adapter.wrappedNative.toLowerCase() && token1.toLowerCase() === token.toLowerCase())
      || (token1.toLowerCase() === adapter.wrappedNative.toLowerCase() && token0.toLowerCase() === token.toLowerCase())
    if (!validPair || amountOut <= 0n || slot0[0] <= 0n) continue
    const ratioX192 = slot0[0] * slot0[0]
    const q192 = 1n << 192n
    const inputIs0 = tokenIn.toLowerCase() === token0.toLowerCase()
    const spotOut = inputIs0 ? amountIn * ratioX192 / q192 : amountIn * q192 / ratioX192
    candidates.push({
      adapterId: adapter.id,
      adapterName: adapter.name,
      kind: 'v3',
      router: adapter.router,
      pool,
      wrappedNative: adapter.wrappedNative,
      token,
      tokenIn,
      tokenOut,
      direction,
      amountIn,
      amountOut,
      minimumOut: amountOut * BigInt(10_000 - slippageBps) / 10_000n,
      slippageBps,
      priceImpactBps: impactBps(spotOut, amountOut),
      fee,
      path: [tokenIn, tokenOut],
      verifiedAtBlock: block
    })
  }
  return candidates.sort((a, b) => a.amountOut === b.amountOut ? 0 : a.amountOut > b.amountOut ? -1 : 1)[0] ?? null
}

export async function quoteBestDex(
  client: PublicClient,
  adapters: readonly DexAdapter[],
  tokenInput: string,
  amountIn: bigint,
  direction: 'buy' | 'sell',
  slippageBps: number
): Promise<DexQuote> {
  if (!isAddress(tokenInput)) throw new Error('Token address is invalid')
  if (amountIn <= 0n) throw new Error('Trade amount must be greater than zero')
  if (!Number.isInteger(slippageBps) || slippageBps < 0 || slippageBps > 500) throw new Error('External DEX slippage must be 0–500 bps')
  const token = getAddress(tokenInput)
  const quotes: DexQuote[] = []
  const failures: string[] = []
  for (const adapter of adapters) {
    try {
      await verifyDexAdapter(client, adapter)
      const quote = adapter.kind === 'v2'
        ? await quoteV2(client, adapter, token, amountIn, direction, slippageBps)
        : await quoteV3(client, adapter, token, amountIn, direction, slippageBps)
      if (quote) quotes.push(quote)
    } catch (error) {
      failures.push(`${adapter.name}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  const best = quotes.sort((a, b) => a.amountOut === b.amountOut ? 0 : a.amountOut > b.amountOut ? -1 : 1)[0]
  if (!best) throw new Error(`No configured, code-hash-pinned V2/V3 route has usable liquidity${failures.length ? ` (${failures.slice(0, 2).join('; ')})` : ''}`)
  return best
}

export function v3SellCalldata(quote: DexQuote, recipient: Address, deadline: bigint): `0x${string}`[] {
  if (quote.kind !== 'v3' || quote.fee === null) throw new Error('V3 quote required')
  return [
    encodeFunctionData({
      abi: v3RouterAbi,
      functionName: 'exactInputSingle',
      args: [{ tokenIn: quote.tokenIn, tokenOut: quote.tokenOut, fee: quote.fee, recipient: quote.router, deadline, amountIn: quote.amountIn, amountOutMinimum: quote.minimumOut, sqrtPriceLimitX96: 0n }]
    }),
    encodeFunctionData({ abi: v3RouterAbi, functionName: 'unwrapWETH9', args: [quote.minimumOut, recipient] })
  ]
}
