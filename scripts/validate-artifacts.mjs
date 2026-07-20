import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const sourceRoot = path.join(root, 'src')
const artifactRoot = path.join(root, 'artifacts', 'solc')
const buildInfoPath = path.join(artifactRoot, '_build-info.json')

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(full) : [full]
  })
}

if (!fs.existsSync(buildInfoPath)) throw new Error('Missing artifacts/solc/_build-info.json. Run npm run compile.')
const build = JSON.parse(fs.readFileSync(buildInfoPath, 'utf8'))
const sources = walk(sourceRoot).filter((file) => file.endsWith('.sol')).map((file) => [
  path.relative(root, file).replaceAll(path.sep, '/'),
  fs.readFileSync(file, 'utf8')
]).sort(([a], [b]) => a.localeCompare(b))
const digest = crypto.createHash('sha256').update(sources.map(([name, content]) => `${name}\0${content}\0`).join('')).digest('hex')
if (digest !== build.sourceBundleSha256) throw new Error('Solidity sources do not match the packaged artifacts. Run npm run compile.')
for (const name of ['StockCoinLaunchpad', 'StockCoinPool', 'LaunchToken', 'LiquidityLocker', 'CreatorVestingVault', 'AttestedEligibilityGate']) {
  const file = path.join(artifactRoot, `${name}.json`)
  if (!fs.existsSync(file)) throw new Error(`Missing required compiler artifact: ${name}.json`)
  const artifact = JSON.parse(fs.readFileSync(file, 'utf8'))
  if (!artifact.bytecode || artifact.bytecode === '0x' || !artifact.deployedBytecode || artifact.deployedBytecode === '0x') throw new Error(`Incomplete compiler artifact: ${name}.json`)
  if (artifact.compiler !== build.compiler) throw new Error(`Compiler mismatch in ${name}.json`)
}

const abiTarget = path.join(root, 'apps', 'web', 'src', 'abi', 'contracts.ts')
const abiExports = [['launchpadAbi', 'StockCoinLaunchpad'], ['poolAbi', 'StockCoinPool'], ['erc20Abi', 'LaunchToken']]
const expectedAbi = `${abiExports.map(([exportName, contractName]) => {
  const artifact = JSON.parse(fs.readFileSync(path.join(artifactRoot, `${contractName}.json`), 'utf8'))
  return `export const ${exportName} = ${JSON.stringify(artifact.abi, null, 2)} as const`
}).join('\n\n')}\n`
if (!fs.existsSync(abiTarget) || fs.readFileSync(abiTarget, 'utf8') !== expectedAbi) {
  throw new Error('Browser ABI does not match packaged artifacts. Run npm run generate:web-abi or npm run compile.')
}

console.log(JSON.stringify({ ok: true, compiler: build.compiler, contracts: build.contracts, sourceBundleSha256: digest, browserAbiMatched: true }, null, 2))
