import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { transformWithOxc } from 'vite'
import { fileURLToPath, pathToFileURL } from 'node:url'

const scriptsDir = path.dirname(fileURLToPath(import.meta.url))
const libDir = path.resolve(scriptsDir, '../src/lib')
const nonce = `${process.pid}-${Date.now()}`
const securityTemp = path.join(libDir, `.security-v090-${nonce}.mjs`)
const dexTemp = path.join(libDir, `.dex-v090-${nonce}.mjs`)
const directTemp = path.join(libDir, `.direct-v090-${nonce}.mjs`)

async function compile(sourceName, outputName, replacements = []) {
  const sourceFile = path.join(libDir, sourceName)
  let source = await fs.readFile(sourceFile, 'utf8')
  for (const [from, to] of replacements) source = source.replaceAll(from, to)
  const result = await transformWithOxc(source, sourceFile, { lang: 'ts', format: 'esm', target: 'es2022' })
  await fs.writeFile(outputName, result.code)
}

await compile('security.ts', securityTemp)
await compile('dex.ts', dexTemp, [["'./security'", `'./${path.basename(securityTemp)}'`]])
await compile('direct-rpc.ts', directTemp, [["'./security'", `'./${path.basename(securityTemp)}'`]])

const dex = await import(`${pathToFileURL(dexTemp).href}?v=${Date.now()}`)
const direct = await import(`${pathToFileURL(directTemp).href}?v=${Date.now()}`)

const address = (digit) => `0x${digit.repeat(40)}`
const hash = (digit) => `0x${digit.repeat(64)}`

function v2(overrides = {}) {
  return {
    id: 'reviewed-v2', name: 'Reviewed V2', kind: 'v2', chainId: 4663,
    factory: address('1'), router: address('2'), wrappedNative: address('3'),
    factoryCodeHash: hash('a'), routerCodeHash: hash('b'), wrappedNativeCodeHash: hash('c'),
    pairCodeHash: hash('d'), enabled: true, ...overrides
  }
}

function v3(overrides = {}) {
  return {
    id: 'reviewed-v3', name: 'Reviewed V3', kind: 'v3', chainId: 4663,
    factory: address('4'), router: address('5'), wrappedNative: address('6'), quoter: address('7'),
    factoryCodeHash: hash('1'), routerCodeHash: hash('2'), wrappedNativeCodeHash: hash('3'),
    poolCodeHash: hash('4'), quoterCodeHash: hash('5'), quoterVariant: 'v2', fees: [500, 3000], enabled: true,
    ...overrides
  }
}

test('DEX adapters require exact chain and complete non-zero runtime pins', () => {
  assert.equal(dex.parseDexAdapters([v2()], 4663).length, 1)
  assert.equal(dex.parseDexAdapters([v3()], 4663).length, 1)
  assert.equal(dex.parseDexAdapters([v2({ pairCodeHash: undefined })], 4663).length, 0)
  assert.equal(dex.parseDexAdapters([v3({ poolCodeHash: undefined })], 4663).length, 0)
  assert.equal(dex.parseDexAdapters([v3({ quoterCodeHash: hash('0') })], 4663).length, 0)
  assert.equal(dex.parseDexAdapters([v2({ chainId: 46630 })], 4663).length, 0)
  assert.equal(dex.parseDexAdapters('{broken', 4663).length, 0)
})

test('disabled and malformed adapters never become executable routes', () => {
  assert.equal(dex.parseDexAdapters([v2({ enabled: false }), { kind: 'v2' }, null], 4663).length, 0)
  assert.equal(dex.parseDexAdapters({ adapters: [v2()] }, 4663)[0].id, 'reviewed-v2')
})

test('direct Radar scores are bounded and high-risk candidates remain blocked', () => {
  const base = {
    address: address('8'), deployer: address('9'), blockNumber: '100', transactionHash: hash('6'),
    timestamp: Math.floor(Date.now() / 1000) - 60, codeHash: hash('7'), codeSize: 100,
    token: { name: 'Example', symbol: 'EX', decimals: 18, totalSupply: '1000000', owner: null, paused: false },
    risk: { score: 20, status: 'LOW', findings: [] }, source: 'direct-rpc'
  }
  const score = direct.directRadarScore(base)
  assert.ok(score.overall >= 0 && score.overall <= 100)
  assert.equal(direct.isDirectRpcCandidateTradable(base), true)
  assert.equal(direct.isDirectRpcCandidateTradable({ ...base, risk: { ...base.risk, score: 65 } }), false)
  assert.equal(direct.isDirectRpcCandidateTradable({ ...base, token: null }), false)
})

test('direct pool fallback reads V2 reserves and computes a live price ratio', async () => {
  const token0 = address('a')
  const token1 = address('b')
  const pair = address('c')
  const factory = address('d')
  const transactionHash = hash('e')
  const tokenMeta = {
    [token0.toLowerCase()]: { name: 'Token Zero', symbol: 'TK0', decimals: 18, totalSupply: 1_000_000n },
    [token1.toLowerCase()]: { name: 'Token One', symbol: 'TK1', decimals: 6, totalSupply: 2_000_000n }
  }
  const client = {
    getBlockNumber: async () => 100n,
    getLogs: async () => [{ eventName: 'PairCreated', args: { token0, token1, pair }, address: factory, transactionHash, blockNumber: 100n }],
    getBlock: async () => ({ timestamp: 1_700_000_000n }),
    readContract: async ({ address: target, functionName }) => {
      const key = String(target).toLowerCase()
      if (key === pair.toLowerCase()) {
        if (functionName === 'token0') return token0
        if (functionName === 'token1') return token1
        if (functionName === 'getReserves') return [2_000_000_000_000_000_000n, 4_000_000n, 0]
        if (functionName === 'totalSupply') return 1000n
      }
      const meta = tokenMeta[key]
      if (!meta) throw new Error('unknown contract')
      if (functionName === 'name') return meta.name
      if (functionName === 'symbol') return meta.symbol
      if (functionName === 'decimals') return meta.decimals
      if (functionName === 'totalSupply') return meta.totalSupply
      throw new Error('optional probe unavailable')
    }
  }
  const pools = await direct.scanRecentPools(client, { chainId: 4663, chain: 'Robinhood Chain', lookback: 100 })
  assert.equal(pools.length, 1)
  assert.equal(pools[0].standard, 'uniswap-v2')
  assert.equal(pools[0].market.hasLiquidity, true)
  assert.equal(pools[0].market.price1Per0, '2')
  assert.equal(pools[0].token0Meta.symbol, 'TK0')
  assert.equal(pools[0].token1Meta.symbol, 'TK1')
})

test.after(async () => {
  await Promise.all([securityTemp, dexTemp, directTemp].map((file) => fs.rm(file, { force: true })))
})
