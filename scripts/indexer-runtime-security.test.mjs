import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import net from 'node:net'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))

async function freePort() {
  const server = net.createServer()
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0
  await new Promise((resolve) => server.close(resolve))
  return port
}

function request(port, pathname, { method = 'GET', host = `127.0.0.1:${port}`, origin } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path: pathname, method, headers: { host, ...(origin ? { origin } : {}) } }, (res) => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => { body += chunk })
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }))
    })
    req.on('error', reject)
    req.end()
  })
}

async function waitForServer(port, child) {
  const deadline = Date.now() + 15_000
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`indexer exited with ${child.exitCode}`)
    try {
      const response = await request(port, '/api/radar/sources')
      if (response.status === 200) return
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error('indexer did not become ready')
}

test('live indexer rejects hostile hosts, origins, methods and malformed queries', async (t) => {
  const port = await freePort()
  const child = spawn(process.execPath, ['services/indexer/src/server.mjs'], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: String(port),
      RH_CHAIN_ID: '31337',
      RH_CHAIN_NAME: 'Security Test',
      RH_RPC_URL: 'http://127.0.0.1:1',
      RH_EXPLORER_URL: 'http://127.0.0.1:1',
      ALLOWED_ORIGINS: 'http://127.0.0.1:5173',
      ALLOWED_HOSTS: '127.0.0.1,localhost',
      SCOUT_ENABLED: 'false',
      PRODUCTION_TRADING_ENABLED: 'false'
    }
  })
  let stderr = ''
  child.stderr.on('data', (chunk) => { stderr += chunk })
  t.after(async () => {
    if (child.exitCode === null) child.kill('SIGTERM')
    await Promise.race([once(child, 'exit'), new Promise((resolve) => setTimeout(resolve, 3_000))])
    if (child.exitCode === null) child.kill('SIGKILL')
  })

  await waitForServer(port, child)

  const valid = await request(port, '/api/radar/sources', { origin: 'http://127.0.0.1:5173' })
  assert.equal(valid.status, 200, stderr)
  assert.equal(valid.headers['x-stockpair-api-version'], '0.9.0')
  assert.equal(valid.headers['x-robots-tag'], 'noindex, nofollow, noarchive')
  assert.equal(valid.headers['access-control-allow-origin'], 'http://127.0.0.1:5173')

  assert.equal((await request(port, '/api/launches?limit=nan')).status, 400)
  assert.equal((await request(port, '/api/activity?blocks=-1')).status, 400)
  assert.equal((await request(port, '/api/radar/candidates?stage=<script>')).status, 400)
  assert.equal((await request(port, '/api/robinhood/finality?transactionHash=0x1234')).status, 400)
  assert.equal((await request(port, '/api/radar/sources', { host: 'evil.example' })).status, 421)
  assert.equal((await request(port, '/api/radar/sources', { origin: 'https://evil.example' })).status, 403)
  assert.equal((await request(port, '/api/radar/sources', { method: 'POST' })).status, 405)
  assert.equal((await request(port, `/${'a'.repeat(2_100)}`)).status, 414)
})
