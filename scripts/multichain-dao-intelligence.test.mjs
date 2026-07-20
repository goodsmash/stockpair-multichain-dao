import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { toFunctionSelector } from 'viem'
import { analyzeDaoBytecode, assessDaoDormancy } from '../services/indexer/src/intelligence/dao-intelligence.mjs'

function bytecodeWith(...signatures) {
  return `0x6000${signatures.map((signature) => toFunctionSelector(signature).slice(2)).join('6001')}00`
}

test('DAO bytecode classifier distinguishes governor, timelock and multisig evidence', () => {
  const governor = analyzeDaoBytecode(bytecodeWith(
    'propose(address[],uint256[],bytes[],string)',
    'castVote(uint256,uint8)',
    'state(uint256)',
    'quorum(uint256)',
    'votingPeriod()'
  ))
  assert.equal(governor.candidate, true)
  assert.ok(governor.roles.some((item) => item.role === 'governor' && item.confidence === 'high'))

  const treasury = analyzeDaoBytecode(bytecodeWith(
    'getOwners()',
    'getThreshold()',
    'execTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes)',
    'nonce()'
  ))
  assert.ok(treasury.roles.some((item) => item.role === 'multisig-treasury'))

  const ordinary = analyzeDaoBytecode('0x6000600055')
  assert.equal(ordinary.candidate, false)
})

test('dormancy scoring requires age and inactivity evidence and never asserts ownership', () => {
  const now = Date.UTC(2026, 6, 20)
  const day = 86_400_000
  const dormant = assessDaoDormancy({
    nowMs: now,
    deployedAt: now - 500 * day,
    lastActivityAt: now - 250 * day,
    observedCallCount: 0,
    nativeBalanceWei: '0',
    hasLiveLiquidity: false,
    minAgeDays: 30,
    inactiveDays: 180
  })
  assert.equal(dormant.status, 'dormant-candidate')
  assert.ok(dormant.score >= 70)
  assert.match(dormant.limitation, /does not establish abandonment, ownership, recoverability/i)

  const active = assessDaoDormancy({
    nowMs: now,
    deployedAt: now - 500 * day,
    lastActivityAt: now - 2 * day,
    observedCallCount: 40,
    nativeBalanceWei: '1000000000000000000',
    hasLiveLiquidity: true
  })
  assert.equal(active.status, 'active-evidence')
  assert.ok(active.score < dormant.score)
})

test('multi-chain API and UI preserve read-only, manual-review execution boundaries', async () => {
  const [scout, server, radar, ui, config] = await Promise.all([
    fs.readFile(new URL('../services/indexer/src/scout.mjs', import.meta.url), 'utf8'),
    fs.readFile(new URL('../services/indexer/src/server.mjs', import.meta.url), 'utf8'),
    fs.readFile(new URL('../services/indexer/src/intelligence/radar.mjs', import.meta.url), 'utf8'),
    fs.readFile(new URL('../apps/web/src/main.ts', import.meta.url), 'utf8'),
    fs.readFile(new URL('../services/indexer/src/config.mjs', import.meta.url), 'utf8')
  ])
  assert.match(server, /\/api\/scout\/scan\//)
  assert.match(server, /\/api\/scout\/daos/)
  assert.match(server, /\/api\/scout\/chains/)
  assert.match(server, /\/api\/radar\/opportunities/)
  assert.match(scout, /dormantDaoCandidates/)
  assert.match(scout, /dao-dormancy-candidate/)
  assert.match(scout, /pool-liquidity-removed/)
  assert.match(scout, /external-liquidity-drop/)
  assert.match(scout, /autoExecutionAllowed: false/)
  assert.match(radar, /userSignatureRequired: true/)
  assert.match(radar, /never stores a key, signs, front-runs, sandwiches/i)
  assert.match(ui, /DAO Intelligence/)
  assert.match(ui, /Scan any configured chain/)
  assert.match(ui, /Autonomous execution is always disabled/)
  assert.match(config, /SCOUT_CHAIN_STALL_MS/)
  assert.match(config, /DAO_DORMANCY_ALERT_SCORE/)
})
