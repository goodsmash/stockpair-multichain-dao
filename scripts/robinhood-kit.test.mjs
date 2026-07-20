import test from 'node:test'
import assert from 'node:assert/strict'
import { RobinhoodChainKitClient, assessOracleSnapshot, deriveUnderlyingSharePrice, scaleRawToShares } from '../packages/robinhood-chain-kit/src/index.js'

const API_HEADERS = {
  'content-type': 'application/json',
  'x-stockpair-api-version': '0.9.0'
}

test('ERC-8056 helper math is integer-safe', () => {
  assert.equal(scaleRawToShares('2000000000000000000', '1050000000000000000'), '2100000000000000000')
  assert.equal(deriveUnderlyingSharePrice('10500000000', '1050000000000000000'), '10000000000')
})

test('oracle assessment rejects stale, paused, or sequencer-unsafe data', () => {
  const now = 10_000
  assert.equal(assessOracleSnapshot({ answer: '1', updatedAt: 9_900, heartbeatSeconds: 200, nowSeconds: now, sequencerUp: true, sequencerStartedAt: 5_000, gracePeriodSeconds: 100 }).eligible, true)
  const blocked = assessOracleSnapshot({ answer: '1', updatedAt: 1, heartbeatSeconds: 200, nowSeconds: now, sequencerUp: false, sequencerStartedAt: 9_999, oraclePaused: true })
  assert.equal(blocked.eligible, false)
  assert.ok(blocked.blockers.length >= 3)
})

test('client is read-only, requires HTTPS remotely and verifies API version', async () => {
  assert.throws(() => new RobinhoodChainKitClient({ baseUrl: 'http://example.com' }), /HTTPS/)
  assert.throws(() => new RobinhoodChainKitClient({ baseUrl: 'https://example.com', expectedApiVersion: 'next' }), /exact semantic version/)
  const calls = []
  const client = new RobinhoodChainKitClient({ baseUrl: 'http://127.0.0.1:8787', fetch: async (url) => {
    calls.push(url)
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: API_HEADERS })
  } })
  await client.getNetwork()
  await client.getFinality(`0x${'11'.repeat(32)}`)
  assert.equal(calls.length, 2)
  assert.ok(calls.every((url) => String(url).includes('/api/robinhood/')))
})

test('client rejects incompatible or non-JSON indexers', async () => {
  const mismatch = new RobinhoodChainKitClient({
    baseUrl: 'https://indexer.example.com',
    fetch: async () => new Response('{}', { headers: { ...API_HEADERS, 'x-stockpair-api-version': '0.8.0' } })
  })
  await assert.rejects(() => mismatch.getNetwork(), /API mismatch/)

  const wrongType = new RobinhoodChainKitClient({
    baseUrl: 'https://indexer.example.com',
    fetch: async () => new Response('{}', { headers: { ...API_HEADERS, 'content-type': 'text/plain' } })
  })
  await assert.rejects(() => wrongType.getNetwork(), /unexpected content type/)
})
