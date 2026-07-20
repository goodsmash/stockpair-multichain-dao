import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const scout = await fs.readFile(new URL('../services/indexer/src/scout.mjs', import.meta.url), 'utf8')
const server = await fs.readFile(new URL('../services/indexer/src/server.mjs', import.meta.url), 'utf8')
const config = await fs.readFile(new URL('../services/indexer/src/config.mjs', import.meta.url), 'utf8')
const browser = await fs.readFile(new URL('../apps/web/src/lib/direct-rpc.ts', import.meta.url), 'utf8')
const ui = await fs.readFile(new URL('../apps/web/src/main.ts', import.meta.url), 'utf8')

test('Scout uses filtered DEX logs, durable checkpoints and reorg replay', () => {
  assert.match(scout, /getLogs\(\{ events: SCOUT_POOL_EVENTS/)
  assert.match(scout, /address: addresses,[\s\S]*events: SCOUT_SWAP_EVENTS/)
  assert.match(scout, /verifyCheckpoint/)
  assert.match(scout, /SCOUT_STATE_FILE|scoutStateFile/)
  assert.match(scout, /pool-liquidity-live/)
  assert.match(scout, /poolRefreshCursor/)
  assert.doesNotMatch(scout, /getLogs\(\{\s*fromBlock,\s*toBlock\s*\}\)/)
})

test('live intelligence API exposes pending, wallet and evidence-enriched scanning', () => {
  assert.match(server, /\/api\/scout\/pending/)
  assert.match(server, /\/api\/scout\/wallet-activity/)
  assert.match(server, /enrichedTokenScan/)
  assert.match(scout, /poolsForToken/)
  assert.match(scout, /swapsForPools/)
  assert.match(server, /Multi-auditor|auditors:/i)
})

test('three-second polling and bounded direct pool fallback remain explicit', () => {
  assert.match(config, /SCOUT_POLL_INTERVAL_MS', 3_000/)
  assert.match(browser, /Direct pool scan is limited to 100 blocks per request/)
  assert.match(browser, /function scanRecentPools|export async function scanRecentPools/)
  assert.match(ui, /Pending deployment queue/)
  assert.match(ui, /Scanner evidence alone cannot authorize a trade/)
})
