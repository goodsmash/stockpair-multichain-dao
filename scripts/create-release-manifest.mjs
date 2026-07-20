import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const excludedDirs = new Set(['node_modules', '.git', 'cache', 'out', 'coverage', 'broadcast', 'var'])
const excludedFiles = new Set(['release-manifest.json', 'SHA256SUMS', 'apps/web/.env.local', 'deployments/local.json'])

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (excludedDirs.has(entry.name)) return []
    const full = path.join(dir, entry.name)
    const relative = path.relative(root, full).replaceAll(path.sep, '/')
    if (excludedFiles.has(relative) || relative.startsWith('apps/web/dist/') || relative.endsWith('.zip') || relative.endsWith('.sha256')) return []
    return entry.isDirectory() ? walk(full) : entry.isFile() ? [full] : []
  })
}

const files = walk(root).sort((a, b) => a.localeCompare(b))
const entries = files.map((file) => {
  const buffer = fs.readFileSync(file)
  return {
    path: path.relative(root, file).replaceAll(path.sep, '/'),
    bytes: buffer.length,
    sha256: crypto.createHash('sha256').update(buffer).digest('hex')
  }
})
const verification = JSON.parse(fs.readFileSync(path.join(root, 'qa/V0.9.0_FINAL_VERIFICATION.json'), 'utf8'))
const build = JSON.parse(fs.readFileSync(path.join(root, 'artifacts/solc/_build-info.json'), 'utf8'))
const liveMainnetVerification = JSON.parse(fs.readFileSync(path.join(root, 'qa/live-mainnet-intelligence-v0.9.0.json'), 'utf8'))
const multichainDaoVerification = JSON.parse(fs.readFileSync(path.join(root, 'qa/multichain-dao-intelligence-v0.9.0.json'), 'utf8'))
const manifest = {
  schemaVersion: 2,
  release: 'StockPair App v0.9.0 multi-chain and DAO intelligence extension',
  protocolRelease: 'StockPair Protocol v0.6.0 (unchanged)',
  generatedAt: new Date().toISOString(),
  status: verification.status,
  packagePurpose: 'Reproducible StockPair source extension with configured-EVM-chain health and discovery, DAO/governance and dormancy evidence, indexed liquidity and activity intelligence, bounded direct-RPC fallback, and reviewed-hash-gated user-signed execution.',
  sourceBundleSha256: build.sourceBundleSha256,
  compiler: build.compiler,
  files: entries.length,
  totalBytes: entries.reduce((sum, entry) => sum + entry.bytes, 0),
  verification,
  liveMainnetVerification,
  multichainDaoVerification,
  inventory: entries
}
fs.writeFileSync(path.join(root, 'release-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
fs.writeFileSync(path.join(root, 'SHA256SUMS'), `${entries.map((entry) => `${entry.sha256}  ${entry.path}`).join('\n')}\n`)
console.log(JSON.stringify({ ok: true, files: manifest.files, totalBytes: manifest.totalBytes, sourceBundleSha256: manifest.sourceBundleSha256, status: manifest.status }, null, 2))
