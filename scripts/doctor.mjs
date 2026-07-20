import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const errors = []
const warnings = []
const [major, minor] = process.versions.node.split('.').map(Number)
if (major !== 22 || minor < 12) errors.push(`Node.js 22.12+ and <23 is required; current ${process.version}`)
const npmVersion = process.env.npm_config_user_agent?.match(/npm\/(\d+\.\d+\.\d+)/)?.[1]
if (npmVersion && Number(npmVersion.split('.')[0]) !== 10) warnings.push(`npm 10.x is recommended; current ${npmVersion}`)

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'))
const expectedWorkspaces = ['apps/web', 'services/indexer', 'packages/launch-intelligence-sdk', 'packages/robinhood-chain-kit']
for (const workspace of expectedWorkspaces) {
  if (!packageJson.workspaces?.includes(workspace)) errors.push(`Root package.json is missing workspace ${workspace}`)
  if (!lock.packages?.[workspace]) errors.push(`Root package-lock.json is missing workspace ${workspace}`)
}
if (fs.existsSync(path.join(root, 'apps/web/package-lock.json'))) errors.push('Nested apps/web/package-lock.json must not exist')

const versions = new Map()
for (const file of ['package.json', 'apps/web/package.json', 'services/indexer/package.json', 'packages/launch-intelligence-sdk/package.json', 'packages/robinhood-chain-kit/package.json']) {
  const json = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'))
  versions.set(file, json.version)
}
const uniqueVersions = new Set(versions.values())
if (uniqueVersions.size !== 1) errors.push(`Workspace versions differ: ${[...versions].map(([file, version]) => `${file}=${version}`).join(', ')}`)

const require = createRequire(import.meta.url)
for (const dependency of ['viem', 'ganache', 'solc', 'vite', 'typescript']) {
  try { require.resolve(`${dependency}/package.json`) } catch { errors.push(`Dependency ${dependency} is not installed from the root lockfile`) }
}
for (const target of ['artifacts/solc/_build-info.json', 'apps/web/src/abi/contracts.ts', 'services/indexer/src/server.mjs']) {
  if (!fs.existsSync(path.join(root, target))) errors.push(`Missing required generated/runtime file ${target}`)
}

if (errors.length) {
  console.error('StockPair doctor failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}
for (const warning of warnings) console.warn(`Warning: ${warning}`)
console.log(JSON.stringify({
  ok: true,
  version: [...uniqueVersions][0],
  node: process.version,
  npm: npmVersion ?? 'unknown',
  workspaces: expectedWorkspaces,
  lockfileVersion: lock.lockfileVersion
}, null, 2))
