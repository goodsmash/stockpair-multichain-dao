import fs from 'node:fs'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { deployLocalNode } from './deploy-local-node.mjs'
import { loadGanache } from './lib/load-ganache.mjs'

const ganache = await loadGanache({ announce: true })

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const host = '127.0.0.1'
const rpcPort = 8545
const indexerPort = 8787
const webPort = 5173
const rpcUrl = `http://${host}:${rpcPort}`
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const server = ganache.server({
  logging: { quiet: true },
  wallet: { deterministic: true, totalAccounts: 10 },
  chain: { chainId: 31337, hardfork: 'shanghai' },
  miner: { blockGasLimit: 40_000_000 }
})
server.setMaxListeners?.(50)

const children = []
let stopping = false
let ready = false

function removeLocalState() {
  for (const relative of ['apps/web/.env.local', 'deployments/local.json']) {
    fs.rmSync(path.join(root, relative), { force: true })
  }
}

function child(command, args, options = {}) {
  const processHandle = spawn(command, args, { stdio: 'inherit', shell: false, detached: process.platform !== 'win32', ...options })
  children.push(processHandle)
  processHandle.once('error', (error) => {
    if (!stopping) void failAndStop(`${command} failed to start: ${error.message}`)
  })
  processHandle.once('exit', (code, signal) => {
    if (!stopping) void failAndStop(`${command} exited unexpectedly (${code ?? signal ?? 'unknown'})`)
  })
  return processHandle
}

async function terminateChild(processHandle) {
  if (processHandle.exitCode !== null) return
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(processHandle.pid), '/t', '/f'], { stdio: 'ignore' })
    return
  }
  try { process.kill(-processHandle.pid, 'SIGTERM') } catch {}
  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (processHandle.exitCode === null) {
        try { process.kill(-processHandle.pid, 'SIGKILL') } catch {}
      }
      resolve()
    }, 2_000)
    processHandle.once('exit', () => { clearTimeout(timer); resolve() })
  })
}

async function stop() {
  if (stopping) return
  stopping = true
  await Promise.all(children.map(terminateChild))
  await server.close().catch(() => undefined)
  removeLocalState()
}

async function failAndStop(message) {
  console.error(`\nLocal stack failed: ${message}`)
  await stop()
  process.exit(1)
}

async function waitForJson(url, validate, label, timeoutMs = 60_000) {
  const started = Date.now()
  let lastError = 'no response'
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(2_000) })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const contentType = response.headers.get('content-type') ?? ''
      if (!contentType.includes('application/json')) throw new Error(`unexpected content type ${contentType}`)
      const value = await response.json()
      if (!validate(value)) throw new Error('response did not match the expected local deployment')
      return value
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }
  throw new Error(`${label} was not ready: ${lastError}`)
}

async function waitForHtml(url, timeoutMs = 60_000) {
  const started = Date.now()
  let lastError = 'no response'
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url, { headers: { accept: 'text/html' }, signal: AbortSignal.timeout(2_000) })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const text = await response.text()
      if (!text.includes('StockPair')) throw new Error('unexpected page content')
      return
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }
  throw new Error(`Web UI was not ready: ${lastError}`)
}

process.on('SIGINT', async () => { await stop(); process.exit(0) })
process.on('SIGTERM', async () => { await stop(); process.exit(0) })
process.on('uncaughtException', (error) => void failAndStop(error.stack ?? error.message))
process.on('unhandledRejection', (error) => void failAndStop(error instanceof Error ? error.stack ?? error.message : String(error)))

try {
  removeLocalState()
  await server.listen(rpcPort, host)
  console.log(`Local Robinhood-compatible EVM running at ${rpcUrl}`)
  const initial = server.provider.getInitialAccounts()
  const first = Object.values(initial)[0]
  if (!first) throw new Error('Ganache did not expose the deterministic deployment account')
  const deployment = await deployLocalNode({ rpcUrl, chainId: 31337, privateKey: first.secretKey })
  console.log(`Launchpad: ${deployment.launchpad}`)
  console.log(`Demo pool: ${deployment.pool}`)
  console.log(`Funded unlocked test account: ${deployment.fundedTrader}`)

  child(process.execPath, ['services/indexer/src/server.mjs'], {
    cwd: root,
    env: {
      ...process.env,
      HOST: host,
      PORT: String(indexerPort),
      RH_CHAIN_ID: '31337',
      RH_CHAIN_NAME: 'StockPair Local',
      RH_RPC_URL: rpcUrl,
      RH_EXPLORER_URL: rpcUrl,
      LAUNCHPAD_ADDRESS: deployment.launchpad,
      LAUNCHPAD_CODE_HASH: deployment.launchpadCodeHash,
      LAUNCHPAD_PROTOCOL_VERSION: deployment.protocolVersion,
      PRODUCTION_TRADING_ENABLED: 'true',
      LOCAL_DEMO_ACK: 'I_UNDERSTAND_THIS_IS_DISPOSABLE',
      REQUIRE_EXPLORER_VERIFICATION: 'false',
      ALLOWED_ORIGINS: `http://${host}:${webPort},http://localhost:${webPort}`,
      ALLOWED_HOSTS: `${host},localhost`,
      SCOUT_CHAINS_JSON: JSON.stringify([{ chainId: 31337, name: 'StockPair Local', rpcUrl, explorerUrl: rpcUrl }]),
      SCOUT_INITIAL_LOOKBACK: '50',
      SCOUT_MAX_BLOCKS_PER_POLL: '50'
    }
  })

  await waitForJson(`http://${host}:${indexerPort}/health`, (value) => value?.ok === true, 'Indexer health')
  await waitForJson(`http://${host}:${indexerPort}/api/config`, (value) =>
    value?.chainId === 31337 &&
    String(value?.launchpadAddress).toLowerCase() === deployment.launchpad.toLowerCase() &&
    String(value?.launchpadCodeHash).toLowerCase() === deployment.launchpadCodeHash.toLowerCase() &&
    String(value?.protocolVersion).toLowerCase() === deployment.protocolVersion.toLowerCase(), 'Indexer trust anchors')

  child(npm, ['run', 'dev', '--workspace', 'robinhood-stock-pair-launchpad-web', '--', '--host', host, '--port', String(webPort), '--strictPort'], { cwd: root, env: process.env })
  await waitForHtml(`http://${host}:${webPort}`)

  ready = true
  console.log('\nStockPair local stack is ready and verified:')
  console.log(`Web UI:  http://${host}:${webPort}`)
  console.log(`Indexer: http://${host}:${indexerPort}/health`)
  console.log(`RPC:     ${rpcUrl}`)
  console.log('Press Ctrl+C to stop. Disposable local state is removed automatically.')
} catch (error) {
  await failAndStop(error instanceof Error ? error.stack ?? error.message : String(error))
}

if (!ready) await new Promise(() => {})
