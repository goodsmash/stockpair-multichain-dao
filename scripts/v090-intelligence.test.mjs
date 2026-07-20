import test from 'node:test'
import assert from 'node:assert/strict'
import { createReputationEngine } from '../services/indexer/src/intelligence/reputation.mjs'
import { createAlertDelivery } from '../services/indexer/src/alerts/delivery.mjs'

function fakeScout() {
  const tokenA = '0x1111111111111111111111111111111111111111'
  const tokenB = '0x2222222222222222222222222222222222222222'
  const deployer = '0x3333333333333333333333333333333333333333'
  const pool = '0x4444444444444444444444444444444444444444'
  const swaps = [
    { chainId: 4663, pool, sender: deployer, recipient: deployer, amounts: { amount0In: '1000', amount1Out: '900' }, transactionHash: `0x${'1'.repeat(64)}` },
    { chainId: 4663, pool, sender: deployer, recipient: tokenB, amounts: { amount0In: '1000', amount1Out: '900' }, transactionHash: `0x${'2'.repeat(64)}` },
    { chainId: 4663, pool, sender: tokenB, recipient: deployer, amounts: { amount0In: '1000', amount1Out: '900' }, transactionHash: `0x${'3'.repeat(64)}` }
  ]
  return {
    deployer: () => ({ address: deployer, evidence: [], deployments: [
      { address: tokenA, token: { symbol: 'AAA' }, risk: { score: 12 }, timestamp: Math.floor(Date.now() / 1000) - 7200 },
      { address: tokenB, token: { symbol: 'BBB' }, risk: { score: 80 }, timestamp: Math.floor(Date.now() / 1000) - 3600 }
    ] }),
    pools: () => [{ chainId: 4663, pool, token0: tokenA, token1: tokenB, verifiedFactory: true }],
    swaps: () => swaps,
    values: { deployer, pool }
  }
}

test('deployer reputation is bounded and evidence-limited', () => {
  const scout = fakeScout()
  const engine = createReputationEngine({ scout })
  const result = engine.deployer(4663, scout.values.deployer)
  assert.ok(result)
  assert.ok(result.score >= 0 && result.score <= 100)
  assert.equal(result.breakdown.tokensDeployed, 2)
  assert.equal(result.breakdown.knownRugPulls, null)
  assert.match(result.warnings.join(' '), /does not prove/i)
})

test('manipulation detector reports self and matched-size warnings without claiming proof', () => {
  const scout = fakeScout()
  const engine = createReputationEngine({ scout })
  const result = engine.manipulation(4663, scout.values.pool)
  assert.ok(result)
  assert.equal(result.signals.selfTrades, 1)
  assert.equal(result.signals.matchedSizeGroups.length, 1)
  assert.match(result.limitation, /not proof/i)
})

test('webhook delivery signs a bounded payload and ignores non-launch events', async () => {
  const calls = []
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options })
    return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
  }
  try {
    const delivery = createAlertDelivery({
      alertDeliveryEnabled: true,
      alertWebhookUrl: 'https://hooks.example.test/launches',
      alertWebhookSecret: 'x'.repeat(40),
      discordWebhookUrl: null,
      telegramBotToken: '',
      telegramChatId: '',
      alertDeliveryTimeoutMs: 1_000,
      alertDeliveryRetries: 0,
      alertDeliveryQueueMax: 10
    })
    assert.equal(delivery.enqueue({ id: 'ignored', kind: 'swap-observed' }), false)
    assert.equal(delivery.enqueue({ id: 'token:1', kind: 'token-detected', chainId: 4663, address: '0x1111111111111111111111111111111111111111', transactionHash: `0x${'a'.repeat(64)}`, blockNumber: '10', risk: { score: 20, status: 'low' }, token: { symbol: 'AAA', decimals: 18 } }), true)
    await new Promise((resolve) => setTimeout(resolve, 30))
    assert.equal(calls.length, 1)
    assert.match(calls[0].options.headers['x-stockpair-signature'], /^sha256=[0-9a-f]{64}$/)
    assert.equal(calls[0].options.redirect, 'error')
    assert.equal(delivery.status().delivered, 1)
    delivery.stop()
  } finally { globalThis.fetch = originalFetch }
})

import { createProtocolAlertMonitor } from '../services/indexer/src/alerts/protocol-monitor.mjs'

test('protocol alert monitor baselines first, then emits ownership and liquidity events incrementally', async () => {
  const factory = '0x1111111111111111111111111111111111111111'
  const pool = '0x2222222222222222222222222222222222222222'
  const previousOwner = '0x3333333333333333333333333333333333333333'
  const newOwner = '0x4444444444444444444444444444444444444444'
  let head = 100n
  const events = []
  const fakeIndexer = {
    launches: async () => [{ pool }],
    client: {
      getBlockNumber: async () => head,
      getLogs: async ({ address }) => {
        if (head === 100n) return []
        if (Array.isArray(address)) return [{
          address: pool, eventName: 'LiquidityRemoved', blockNumber: 101n, logIndex: 2,
          transactionHash: `0x${'b'.repeat(64)}`,
          args: { provider: previousOwner, recipient: previousOwner, coinAmount: 10n, stockAmount: 20n, liquidity: 5n }
        }]
        return [{
          address: factory, eventName: 'OwnershipTransferred', blockNumber: 101n, logIndex: 1,
          transactionHash: `0x${'a'.repeat(64)}`,
          args: { previousOwner, newOwner }
        }]
      }
    }
  }
  const monitor = createProtocolAlertMonitor({
    indexer: fakeIndexer,
    config: {
      chainId: 4663, network: 'Robinhood Chain', launchpadAddress: factory,
      protocolAlertsEnabled: true, alertProtocolPollIntervalMs: 10_000,
      alertMaxBlocksPerPoll: 100, alertLargeSwapBps: 100
    },
    onEvent: (event) => events.push(event)
  })
  await monitor.poll()
  assert.equal(events.length, 0)
  head = 101n
  await monitor.poll()
  assert.deepEqual(events.map((event) => event.kind), ['ownership-changed', 'liquidity-removed'])
  assert.equal(monitor.status().lastBlock, '101')
  monitor.stop()
})
