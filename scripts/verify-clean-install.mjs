import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'stockpair-clean-install-'))
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const excluded = new Set(['node_modules', '.git', 'dist', 'deployments', '.env.local'])
const commands = [
  ['ci', '--ignore-scripts', '--no-audit', '--no-fund'],
  ['run', 'doctor'],
  ['run', 'validate:artifacts'],
  ['run', 'test:ui'],
  ['run', 'build:web']
]

function filter(source) {
  const relative = path.relative(root, source)
  if (!relative) return true
  return !relative.split(path.sep).some((segment) => excluded.has(segment))
}
function run(args) {
  const started = Date.now()
  const result = spawnSync(npm, args, { cwd: temp, stdio: 'inherit', shell: false, env: process.env })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`npm ${args.join(' ')} failed with ${result.status}`)
  return { command: `npm ${args.join(' ')}`, status: 'PASS', durationMs: Date.now() - started }
}

try {
  fs.cpSync(root, temp, { recursive: true, filter })
  const results = commands.map(run)
  const evidence = {
    ok: true,
    release: '0.9.0',
    node: process.version,
    packageManager: 'npm@10.9.2',
    isolatedDependencyState: true,
    excludedFromCopy: [...excluded],
    commands: results,
    checkedAt: new Date().toISOString()
  }
  const output = path.join(root, 'qa/clean-install-v0.9.0.json')
  fs.mkdirSync(path.dirname(output), { recursive: true })
  fs.writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`)
  console.log(JSON.stringify(evidence, null, 2))
} finally {
  fs.rmSync(temp, { recursive: true, force: true })
}
