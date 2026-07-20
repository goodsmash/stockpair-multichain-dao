import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { transformWithOxc } from 'vite'
import { fileURLToPath, pathToFileURL } from 'node:url'

const scriptsDir = path.dirname(fileURLToPath(import.meta.url))
const sourceFile = path.resolve(scriptsDir, '../src/lib/security.ts')
const tempFile = path.resolve(scriptsDir, '../src/lib/.security-runtime-test.mjs')
const source = await fs.readFile(sourceFile, 'utf8')
const output = (await transformWithOxc(source, sourceFile, { lang: 'ts', format: 'esm', target: 'es2022' })).code
await fs.writeFile(tempFile, output)
const security = await import(`${pathToFileURL(tempFile).href}?v=${Date.now()}`)


test('hostile URLs cannot become explorer links', () => {
  assert.equal(security.safeExplorerUrl('javascript:alert(1)', 'https://safe.example', 'address', '0x1111111111111111111111111111111111111111'), 'https://safe.example/address/0x1111111111111111111111111111111111111111')
  assert.equal(security.safeExplorerUrl('https://user:pass@evil.example', 'https://safe.example', 'tx', `0x${'a'.repeat(64)}`), `https://safe.example/tx/0x${'a'.repeat(64)}`)
  assert.equal(security.safeExplorerUrl('https://safe.example/path', 'https://fallback.example', 'tx', '<svg>'), '#')
  assert.equal(security.safeExplorerUrl('https://safe.example', 'https://fallback.example', 'address', '0x1234'), '#')
  assert.equal(security.safeExplorerUrl('https://safe.example', 'https://fallback.example', 'tx', '0xabcd'), '#')
})

test('hostile values are normalized instead of trusted', () => {
  assert.equal(security.normalizeRiskStatus('<img src=x onerror=alert(1)>'), 'BLOCKED')
  assert.equal(security.safeAddress('<script>'), null)
  assert.equal(security.safeHash(`0x${'a'.repeat(64)}`), `0x${'a'.repeat(64)}`)
  assert.equal(security.boundedText('ok\u0000<script>', 20), 'ok <script>')
  assert.equal(security.safeNumericString('1e30'), '0')
})

test.after(async () => { await fs.rm(tempFile, { force: true }) })
