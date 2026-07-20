import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const artifactRoot = path.join(root, 'artifacts', 'solc')
const target = path.join(root, 'apps', 'web', 'src', 'abi', 'contracts.ts')
const exports = [
  ['launchpadAbi', 'StockCoinLaunchpad'],
  ['poolAbi', 'StockCoinPool'],
  ['erc20Abi', 'LaunchToken']
]

const sections = exports.map(([exportName, contractName]) => {
  const artifact = JSON.parse(fs.readFileSync(path.join(artifactRoot, `${contractName}.json`), 'utf8'))
  if (!Array.isArray(artifact.abi)) throw new Error(`Missing ABI for ${contractName}`)
  return `export const ${exportName} = ${JSON.stringify(artifact.abi, null, 2)} as const`
})
fs.mkdirSync(path.dirname(target), { recursive: true })
fs.writeFileSync(target, `${sections.join('\n\n')}\n`)
console.log(`Generated ${path.relative(root, target)} from source-matched artifacts.`)
