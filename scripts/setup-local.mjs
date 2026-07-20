import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const [major, minor] = process.versions.node.split('.').map(Number)
if (major !== 22 || minor < 12) {
  console.error(`StockPair requires Node.js >=22.12 and <23. Current: ${process.version}`)
  process.exit(1)
}

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const root = fileURLToPath(new URL('../', import.meta.url))

function run(command, args) {
  console.log(`> ${command} ${args.join(' ')}`)
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', env: process.env, shell: false })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${command} exited with ${result.status ?? result.signal ?? 'unknown status'}`)
}

try {
  run(npm, ['ci', '--ignore-scripts', '--no-audit', '--no-fund'])
  run(npm, ['run', 'doctor'])
  run(npm, ['run', 'validate:artifacts'])
  run(npm, ['run', 'test:ui'])
  console.log('\nSetup complete from the single root lockfile.')
  console.log('Run `npm run local` and open http://127.0.0.1:5173')
  console.log('Use `npm run local:fresh` only after intentionally changing Solidity sources.')
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
