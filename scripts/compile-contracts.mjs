import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import solc from 'solc'

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const sourceRoot = path.join(root, 'src')
const outRoot = path.join(root, 'artifacts', 'solc')

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(full) : [full]
  })
}

const sources = {}
for (const file of walk(sourceRoot).filter((file) => file.endsWith('.sol'))) {
  const relative = path.relative(root, file).replaceAll(path.sep, '/')
  sources[relative] = { content: fs.readFileSync(file, 'utf8') }
}

const input = {
  language: 'Solidity',
  sources,
  settings: {
    optimizer: { enabled: true, runs: 100 },
    viaIR: true,
    evmVersion: 'shanghai',
    metadata: { bytecodeHash: 'none' },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object', 'metadata']
      }
    }
  }
}

const output = JSON.parse(solc.compile(JSON.stringify(input)))
const errors = (output.errors ?? []).filter((item) => item.severity === 'error')
for (const item of output.errors ?? []) {
  const stream = item.severity === 'error' ? process.stderr : process.stdout
  stream.write(`${item.formattedMessage}\n`)
}
if (errors.length) process.exit(1)

fs.rmSync(outRoot, { recursive: true, force: true })
fs.mkdirSync(outRoot, { recursive: true })
let written = 0
for (const [sourceName, contracts] of Object.entries(output.contracts ?? {})) {
  for (const [contractName, artifact] of Object.entries(contracts)) {
    const bytecode = artifact.evm?.bytecode?.object ?? ''
    const target = path.join(outRoot, `${contractName}.json`)
    fs.writeFileSync(target, JSON.stringify({
      contractName,
      sourceName,
      compiler: solc.version(),
      abi: artifact.abi,
      bytecode: bytecode ? `0x${bytecode}` : '0x',
      deployedBytecode: artifact.evm?.deployedBytecode?.object ? `0x${artifact.evm.deployedBytecode.object}` : '0x',
      metadata: JSON.parse(artifact.metadata)
    }, null, 2))
    written++
  }
}
const sourceBundleSha256 = crypto.createHash('sha256')
  .update(Object.entries(sources).sort(([a], [b]) => a.localeCompare(b)).map(([name, item]) => `${name}\0${item.content}\0`).join(''))
  .digest('hex')
const settingsSha256 = crypto.createHash('sha256').update(JSON.stringify(input.settings)).digest('hex')
fs.writeFileSync(path.join(outRoot, '_build-info.json'), JSON.stringify({
  schemaVersion: 1,
  compiler: solc.version(),
  generatedAt: new Date().toISOString(),
  sourceBundleSha256,
  settingsSha256,
  contracts: written
}, null, 2) + '\n')
console.log(`Compiled ${written} contracts with ${solc.version()} into ${path.relative(root, outRoot)}`)
// Compilation and artifact writes are synchronous. Terminate deterministically so
// solc-js cannot retain an implementation-specific runtime handle.
process.exit(0)
