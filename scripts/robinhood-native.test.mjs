import test from 'node:test'
import assert from 'node:assert/strict'
import { loadRobinhoodRegistry } from '../services/indexer/src/robinhood/registry.mjs'
import { buildBoundedAaPolicy, buildCrossChainMessagePlan, createRobinhoodNativeIntegration } from '../services/indexer/src/robinhood/native-integration.mjs'

const TOKEN = '0x1111111111111111111111111111111111111111'
const FEED = '0x2222222222222222222222222222222222222222'
const SEQUENCER = '0x3333333333333333333333333333333333333333'
const WALLET = '0x4444444444444444444444444444444444444444'
const TX = `0x${'ab'.repeat(32)}`

function client(now = Math.floor(Date.now() / 1000)) {
  return {
    async getGasPrice() { return 123n },
    async getTransactionReceipt({ hash }) { return hash === TX ? { status: 'success', blockNumber: 99n } : null },
    async getBlock({ blockTag }) { return blockTag === 'finalized' ? { number: 100n } : { number: 101n } },
    async readContract({ address, functionName }) {
      if (functionName === 'latestRoundData') {
        if (address.toLowerCase() === FEED.toLowerCase()) return [7n, 123_00000000n, BigInt(now - 30), BigInt(now - 30), 7n]
        if (address.toLowerCase() === SEQUENCER.toLowerCase()) return [1n, 0n, BigInt(now - 7200), BigInt(now - 10), 1n]
      }
      const values = {
        name: 'Example Stock Token', symbol: 'EXM', decimals: 18, totalSupply: 1_000_000n * 10n ** 18n,
        balanceOf: 2n * 10n ** 18n, uiMultiplier: 1050000000000000000n, newUIMultiplier: 1050000000000000000n,
        effectiveAt: 0n, balanceOfUI: 2100000000000000000n, totalSupplyUI: 1_050_000n * 10n ** 18n, oraclePaused: false
      }
      if (functionName === 'decimals' && address.toLowerCase() === FEED.toLowerCase()) return 8
      if (functionName in values) return values[functionName]
      throw new Error(`unexpected read ${functionName}`)
    }
  }
}

const registry = loadRobinhoodRegistry()
const config = { chainId: 4663, rpcUrl: 'https://robinhood-mainnet.g.alchemy.com/v2/redacted', expectedArbOsVersion: 61 }

test('registry includes reviewed Robinhood mainnet contracts and AA generations', () => {
  assert.equal(registry.networks['4663'].contracts.l1.delayedInbox, '0x1A07cc4BD17E0118BdB54D70990D2158AbAD7a2D')
  assert.equal(registry.networks['4663'].contracts.l2.permit2, '0x000000000022D473030F116dDEE9F6B43aC78BA3')
  assert.deepEqual(Object.keys(registry.networks['4663'].accountAbstraction.entryPoints), ['0.6', '0.7', '0.8'])
})

test('stock token snapshot enforces multiplier, heartbeat, sequencer and corporate-action checks', async () => {
  const integration = createRobinhoodNativeIntegration({ client: client(), config, registry })
  const snapshot = await integration.stockTokenSnapshot({ token: TOKEN, feed: FEED, sequencerFeed: SEQUENCER, wallet: WALLET, heartbeatSeconds: 3600, gracePeriodSeconds: 3600 })
  assert.equal(snapshot.execution.eligible, true)
  assert.equal(snapshot.corporateAction.uiMultiplier, '1050000000000000000')
  assert.equal(snapshot.oracle.multiplierAlreadyApplied, true)
  assert.equal(snapshot.sequencer.up, true)
})

test('stock token snapshot fails closed without feed and sequencer authority', async () => {
  const integration = createRobinhoodNativeIntegration({ client: client(), config, registry })
  const snapshot = await integration.stockTokenSnapshot({ token: TOKEN })
  assert.equal(snapshot.execution.eligible, false)
  assert.ok(snapshot.execution.blockers.some((item) => item.includes('price feed')))
  assert.ok(snapshot.execution.blockers.some((item) => item.includes('sequencer')))
})

test('finality is high-value safe only under finalized provider tag', async () => {
  const integration = createRobinhoodNativeIntegration({ client: client(), config, registry })
  const result = await integration.finality(TX)
  assert.equal(result.transaction.status, 'ethereum-finalized')
  assert.equal(result.transaction.safeForHighValue, true)
})

test('cross-chain plans are unsigned and describe aliasing or challenge constraints', () => {
  const network = registry.networks['4663']
  const down = buildCrossChainMessagePlan(network, { direction: 'l1-to-l2', target: TOKEN, from: WALLET, data: '0x1234' })
  assert.equal(down.unsigned, true)
  assert.ok(down.warnings.some((item) => item.includes('aliased')))
  const up = buildCrossChainMessagePlan(network, { direction: 'l2-to-l1', target: TOKEN, data: '0x' })
  assert.equal(up.steps[1].minimumSeconds, 604800)
})

test('AA policy rejects unbounded sessions', () => {
  assert.throws(() => buildBoundedAaPolicy({ enabled: true, expiresAt: new Date(Date.now() + 60_000).toISOString() }), /target and selector allowlists/)
  const policy = buildBoundedAaPolicy({ enabled: true, entryPointVersion: '0.8', expiresAt: new Date(Date.now() + 60_000).toISOString(), allowedTargets: [TOKEN], allowedSelectors: ['0x12345678'], maxValuePerCall: '1', maxTotalValue: '2' })
  assert.equal(policy.privateKeyStorageAllowed, false)
  assert.equal(policy.session.revocationRequired, true)
})
