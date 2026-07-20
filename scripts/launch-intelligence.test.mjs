import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeLaunchCandidate,
  scoreLaunchCandidate,
  buildRadarSnapshot,
  validateAlertRule,
  evaluateAlertRule,
  validateExecutionPolicy
} from '../services/indexer/src/intelligence/launch-intelligence.mjs'
import { createLaunchSourceRegistry } from '../services/indexer/src/intelligence/source-adapters.mjs'
import { createLaunchRadar } from '../services/indexer/src/intelligence/radar.mjs'

const token = {
  chainId: 46630,
  chain: 'Robinhood Chain Testnet',
  address: '0x1111111111111111111111111111111111111111',
  deployer: '0x2222222222222222222222222222222222222222',
  transactionHash: `0x${'3'.repeat(64)}`,
  blockNumber: '100',
  timestamp: Math.floor(Date.now() / 1000) - 60,
  codeHash: `0x${'4'.repeat(64)}`,
  risk: { score: 10, status: 'LOW', findings: [] },
  token: { name: 'Example', symbol: 'EX', decimals: 18, totalSupply: '1000000', paused: false },
  evidence: [{ type: 'public-label' }]
}

const pool = {
  chainId: 46630,
  token0: token.address,
  token1: '0x3333333333333333333333333333333333333333',
  pool: '0x4444444444444444444444444444444444444444',
  standard: 'uniswap-v2',
  verifiedFactory: true
}

const swap = {
  chainId: 46630,
  pool: pool.pool,
  sender: '0x5555555555555555555555555555555555555555',
  recipient: '0x6666666666666666666666666666666666666666',
  timestamp: Math.floor(Date.now() / 1000)
}

const scout = {
  tokens: () => [token],
  pools: () => [pool],
  swaps: () => [swap],
  deployer: () => ({ contracts: 1, tokens: 1 }),
  codeFamily: () => ({ deployments: [{ address: token.address }] })
}

test('candidate normalization and scoring are deterministic and never auto-executable', () => {
  const normalized = normalizeLaunchCandidate(token, { pools: [pool], swaps: [swap], deployer: scout.deployer(), codeFamily: scout.codeFamily() })
  const scored = scoreLaunchCandidate(normalized, { maxRiskScore: 20 })
  assert.equal(scored.market.verifiedPoolCount, 1)
  assert.equal(scored.market.uniqueTraders, 2)
  assert.equal(scored.execution.eligibleForReview, true)
  assert.equal(scored.execution.autoExecutionAllowed, false)
  assert.ok(scored.scores.overall >= 60)
})

test('high risk or unverified liquidity blocks execution review', () => {
  const normalized = normalizeLaunchCandidate({ ...token, risk: { score: 90, status: 'BLOCKED' } }, { pools: [{ ...pool, verifiedFactory: false }], swaps: [] })
  const scored = scoreLaunchCandidate(normalized, { maxRiskScore: 20 })
  assert.equal(scored.execution.eligibleForReview, false)
  assert.match(scored.execution.blockers.join(' '), /risk score/)
  assert.match(scored.execution.blockers.join(' '), /verified factory/)
})

test('radar snapshot ranks candidates and evaluates alert rules', () => {
  const snapshot = buildRadarSnapshot(scout, { minScore: 1, limit: 10 }, { maxRiskScore: 20 })
  assert.equal(snapshot.count, 1)
  const rule = validateAlertRule({ id: 'good-launch', minScore: 50, maxRiskScore: 20, minVerifiedPools: 1, actions: ['ui'] })
  assert.equal(evaluateAlertRule(snapshot.candidates[0], rule).matched, true)
  const radar = createLaunchRadar({ scout, policy: { maxRiskScore: 20 }, alertRules: [rule] })
  assert.equal(radar.alerts().matches.length, 1)
  assert.equal(radar.snapshot().policy.frontRunningAllowed, false)
  assert.equal(radar.snapshot().policy.userSignatureRequired, true)
})

test('source registry includes v4, bonding curve and LBP adapters', () => {
  const registry = createLaunchSourceRegistry()
  assert.equal(registry.has('uniswap-v4-pool-manager'), true)
  assert.equal(registry.has('constant-product-bonding-curve'), true)
  assert.equal(registry.has('liquidity-bootstrapping-pool'), true)
})

test('guarded policy rejects abusive automation modes', () => {
  const policy = validateExecutionPolicy({ mode: 'user-signed', enabled: true, maxSlippageBps: 100, maxPositionBps: 50 })
  assert.equal(policy.autoExecutionAllowed, false)
  assert.equal(policy.userSignatureRequired, true)
  assert.equal(policy.privateKeyStorageAllowed, false)
  assert.equal(policy.frontRunningAllowed, false)
  assert.equal(policy.sandwichingAllowed, false)
  assert.throws(() => validateExecutionPolicy({ mode: 'session-key', enabled: true, maxDailySpend: '0' }), /daily spend cap/)
})


test('execution policy chain allowlist blocks review on other chains', () => {
  const normalized = normalizeLaunchCandidate(token, { pools: [pool], swaps: [swap], deployer: scout.deployer(), codeFamily: scout.codeFamily() })
  const policy = validateExecutionPolicy({ mode: 'review-only', allowedChainIds: [1] })
  const scored = scoreLaunchCandidate(normalized, policy)
  assert.equal(scored.execution.eligibleForReview, false)
  assert.match(scored.execution.blockers.join(' '), /chain is not allowed/)
})


test('candidate normalization rejects unsafe URLs and forged risk labels', () => {
  const normalized = normalizeLaunchCandidate({
    ...token,
    explorerUrl: 'javascript:alert(1)',
    blockNumber: '1e9',
    risk: { score: 10, status: '<img src=x onerror=alert(1)>', findings: ['ok', { type: 'finding', message: 'bounded' }] },
    evidence: [{ type: 'public-label', url: 'https://evidence.example/item' }, { type: 'bad', url: 'javascript:alert(1)' }],
    token: { ...token.token, decimals: 1000, totalSupply: '9'.repeat(101) }
  })
  assert.equal(normalized.explorerUrl, null)
  assert.equal(normalized.blockNumber, null)
  assert.equal(normalized.risk.status, 'LOW')
  assert.equal(normalized.token.decimals, null)
  assert.equal(normalized.token.totalSupply, null)
  assert.equal(normalized.evidence[0].url, 'https://evidence.example/item')
  assert.equal(normalized.evidence[1].url, undefined)
})
