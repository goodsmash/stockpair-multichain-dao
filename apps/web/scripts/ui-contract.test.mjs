import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8')
const css = fs.readFileSync(new URL('../src/style.css', import.meta.url), 'utf8')
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8')

test('public UI contains every required user surface', () => {
  for (const view of ['discover', 'trade', 'launch', 'portfolio', 'scout', 'scanner', 'activity', 'robinhood', 'settings']) {
    assert.match(source, new RegExp(`['\"]${view}['\"]`), `missing ${view} surface`)
  }
  assert.match(source, /Review and swap/)
  assert.match(source, /Copy diagnostics/)
  assert.match(source, /exact approvals/i)
  assert.match(source, /factory bytecode/i)
  assert.match(source, /ERC-8056/)
  assert.match(source, /NO BROADCAST/)
  assert.match(source, /safeJsonValue/)
})

test('public UI has responsive and accessible shell contracts', () => {
  assert.match(css, /\.mobile-nav/)
  assert.match(css, /prefers-reduced-motion/)
  assert.match(css, /@media \(max-width: 760px\)/)
  assert.match(source, /aria-label="Global market search"/)
  assert.match(source, /aria-live="polite"/)
  assert.match(source, /aria-current/)
  assert.match(source, /activateModal/)
  assert.match(source, /event\.key === 'Escape'/)
  assert.match(css, /:focus-visible/)
  assert.match(html, /manifest\.webmanifest/)
})

test('public build keeps administration disabled by default', () => {
  assert.match(source, /VITE_ENABLE_OPERATIONS \?\? 'false'/)
  assert.match(source, /Operations are disabled in this public build/)
})

test('hostile indexer data and approvals are fail-closed', () => {
  assert.match(source, /normalizeLaunch/)
  assert.match(source, /normalizeScoutContract/)
  assert.match(source, /safeExplorerUrl/)
  assert.match(source, /Indexer response exceeded the 2 MB safety limit/)
  assert.match(source, /Indexer API mismatch/)
  assert.match(source, /expectedIndexerApiVersion = '0\.9\.0'/)
  assert.match(source, /if \(!indexerApiCompatible\) return/)
  assert.match(source, /allowance === amount/)
  assert.doesNotMatch(source, /allowance >= amount/)
  assert.match(source, /Token did not set the exact requested allowance/)
  assert.match(source, /finally \{ if \(approval\) await bestEffortRevoke/)
})

test('pool provenance and degraded discovery are independently represented', () => {
  assert.match(source, /Pool protocol version does not match this release/)
  assert.match(source, /Launch-token metadata commitment does not match the factory record/)
  assert.match(source, /data-banner/)
  assert.match(source, /Verified execution · degraded discovery/)
})

test('v0.9 works without the hosted indexer and keeps fast-buy user controlled', () => {
  assert.match(source, /scanRecentDeployments/)
  assert.match(source, /readDirectNetwork/)
  assert.match(source, /readLaunchesDirect/)
  assert.match(source, /scanTokenDirect/)
  assert.match(source, /directPortfolioRows/)
  assert.match(source, /3_000/)
  assert.match(source, /requestSubmit\(\)/)
  assert.match(source, /Transaction cancelled before wallet signature/)
  assert.match(source, /exactApproveExternal/)
  assert.match(source, /bestEffortExternalRevoke/)
  assert.match(source, /runtime hashes are pinned|runtime hashes are configured|runtime hash/i)
})

test('v0.9 external DEX routing is bounded and not enabled by an arbitrary address', () => {
  const dex = fs.readFileSync(new URL('../src/lib/dex.ts', import.meta.url), 'utf8')
  assert.match(dex, /factoryCodeHash/)
  assert.match(dex, /routerCodeHash/)
  assert.match(dex, /wrappedNativeCodeHash/)
  assert.match(dex, /pairCodeHash/)
  assert.match(dex, /poolCodeHash/)
  assert.match(dex, /slippageBps > 500/)
  assert.match(source, /price impact exceeds the 10% browser safety cap/i)
  assert.match(source, /Buy exceeds the .* ETH browser cap/)
})
