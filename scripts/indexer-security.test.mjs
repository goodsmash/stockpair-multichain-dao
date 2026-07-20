import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const server = fs.readFileSync(new URL('../services/indexer/src/server.mjs', import.meta.url), 'utf8')
const config = fs.readFileSync(new URL('../services/indexer/src/config.mjs', import.meta.url), 'utf8')

test('indexer enforces bounded streams and cross-origin API isolation', () => {
  assert.match(server, /cross-origin-resource-policy': 'cross-origin'/)
  assert.match(server, /x-stockpair-api-version': '0\.9\.0'/)
  assert.match(server, /function hostAllowed/)
  assert.match(server, /Host not allowed/)
  assert.match(server, /function removeStream/)
  assert.match(server, /function writeStream/)
  assert.match(server, /!client\.res\.write\(payload\)/)
  assert.match(server, /isIP\(item\)/)
})

test('production config rejects local, credentialed or path origins', () => {
  assert.match(config, /safeOrigin/)
  assert.match(config, /Production trading requires HTTPS non-loopback ALLOWED_ORIGINS/)
  const base = {
    ...process.env,
    PRODUCTION_TRADING_ENABLED: 'true',
    LAUNCHPAD_ADDRESS: '0x1111111111111111111111111111111111111111',
    LAUNCHPAD_CODE_HASH: `0x${'1'.repeat(64)}`,
    LAUNCHPAD_PROTOCOL_VERSION: `0x${'2'.repeat(64)}`,
    RH_RPC_URL: 'https://rpc.example.com',
    ALLOWED_HOSTS: 'api.example.com'
  }
  for (const origin of ['http://localhost:5173', 'https://user:pass@app.example', 'https://app.example/path']) {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', "import('./services/indexer/src/config.mjs').then(m=>m.loadConfig())"], { cwd: new URL('..', import.meta.url), env: { ...base, ALLOWED_ORIGINS: origin }, encoding: 'utf8' })
    assert.notEqual(result.status, 0, origin)
  }
})



test('production config requires an explicit public indexer host allowlist', () => {
  const base = {
    ...process.env,
    PRODUCTION_TRADING_ENABLED: 'true',
    LAUNCHPAD_ADDRESS: '0x1111111111111111111111111111111111111111',
    LAUNCHPAD_CODE_HASH: `0x${'1'.repeat(64)}`,
    LAUNCHPAD_PROTOCOL_VERSION: `0x${'2'.repeat(64)}`,
    RH_RPC_URL: 'https://rpc.example.com',
    ALLOWED_ORIGINS: 'https://app.example.com'
  }
  for (const hosts of ['*', 'localhost,127.0.0.1', 'https://api.example.com', 'api.example.com/path']) {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', "import('./services/indexer/src/config.mjs').then(m=>m.loadConfig())"], { cwd: new URL('..', import.meta.url), env: { ...base, ALLOWED_HOSTS: hosts }, encoding: 'utf8' })
    assert.notEqual(result.status, 0, hosts)
  }
  const accepted = spawnSync(process.execPath, ['--input-type=module', '-e', "import('./services/indexer/src/config.mjs').then(m=>m.loadConfig())"], { cwd: new URL('..', import.meta.url), env: { ...base, ALLOWED_HOSTS: 'api.example.com' }, encoding: 'utf8' })
  assert.equal(accepted.status, 0, accepted.stderr)
})

test('explicit disposable local demo acknowledgement is narrowly scoped', () => {
  const local = {
    ...process.env,
    RH_CHAIN_ID: '31337',
    RH_RPC_URL: 'http://127.0.0.1:8545',
    RH_EXPLORER_URL: 'http://127.0.0.1:8545',
    ALLOWED_ORIGINS: 'http://127.0.0.1:5173',
    ALLOWED_HOSTS: '127.0.0.1,localhost',
    PRODUCTION_TRADING_ENABLED: 'true',
    LOCAL_DEMO_ACK: 'I_UNDERSTAND_THIS_IS_DISPOSABLE',
    LAUNCHPAD_ADDRESS: '0x1111111111111111111111111111111111111111',
    LAUNCHPAD_CODE_HASH: `0x${'1'.repeat(64)}`,
    LAUNCHPAD_PROTOCOL_VERSION: `0x${'2'.repeat(64)}`
  }
  const accepted = spawnSync(process.execPath, ['--input-type=module', '-e', "import('./services/indexer/src/config.mjs').then(m=>m.loadConfig())"], { cwd: new URL('..', import.meta.url), env: local, encoding: 'utf8' })
  assert.equal(accepted.status, 0, accepted.stderr)
  const rejected = spawnSync(process.execPath, ['--input-type=module', '-e', "import('./services/indexer/src/config.mjs').then(m=>m.loadConfig())"], { cwd: new URL('..', import.meta.url), env: { ...local, RH_CHAIN_ID: '46630' }, encoding: 'utf8' })
  assert.notEqual(rejected.status, 0)
})

test('production transport requires TLS and public endpoint labels redact provider secrets', async () => {
  const base = {
    ...process.env,
    PRODUCTION_TRADING_ENABLED: 'true',
    LAUNCHPAD_ADDRESS: '0x1111111111111111111111111111111111111111',
    LAUNCHPAD_CODE_HASH: `0x${'1'.repeat(64)}`,
    LAUNCHPAD_PROTOCOL_VERSION: `0x${'2'.repeat(64)}`,
    ALLOWED_ORIGINS: 'https://app.example.com',
    ALLOWED_HOSTS: 'api.example.com',
    SCOUT_CHAINS_JSON: JSON.stringify([{ chainId: 46630, name: 'Robinhood Testnet', rpcUrl: 'https://rpc.private.example/v2/secret', explorerUrl: 'https://explorer.example' }])
  }
  for (const override of [
    { RH_RPC_URL: 'http://rpc.example.com', RH_EXPLORER_URL: 'https://explorer.example' },
    { RH_RPC_URL: 'https://rpc.example.com', RH_EXPLORER_URL: 'http://explorer.example' },
    { RH_RPC_URL: 'https://rpc.example.com', RH_EXPLORER_URL: 'https://explorer.example', RH_WS_URL: 'ws://stream.example' }
  ]) {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', "import('./services/indexer/src/config.mjs').then(m=>m.loadConfig())"], { cwd: new URL('..', import.meta.url), env: { ...base, ...override }, encoding: 'utf8' })
    assert.notEqual(result.status, 0, JSON.stringify(override))
  }

  const { publicEndpointLabel, publicEndpointMetadata } = await import('../services/indexer/src/security/public-endpoint.mjs')
  const secretUrl = 'https://rpc.private.example/v2/SHOULD_NOT_LEAK?apiKey=ALSO_SECRET'
  assert.equal(publicEndpointLabel(secretUrl), 'https://configured-provider')
  assert.deepEqual(publicEndpointMetadata(secretUrl), { configured: true, transport: 'https', loopback: false, label: 'https://configured-provider' })
  assert.equal(publicEndpointLabel('http://127.0.0.1:8545/private'), 'http://127.0.0.1:8545')
  assert.doesNotMatch(publicEndpointLabel(secretUrl), /SHOULD_NOT_LEAK|ALSO_SECRET|rpc\.private/)

  const indexerSource = fs.readFileSync(new URL('../services/indexer/src/indexer.mjs', import.meta.url), 'utf8')
  assert.match(indexerSource, /rpcEndpoint:\s*publicEndpointMetadata\(config\.rpcUrl\)/)
})
