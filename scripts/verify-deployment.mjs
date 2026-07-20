import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'
import {
  createPublicClient,
  defineChain,
  getAddress,
  http,
  isAddress,
  keccak256,
  zeroAddress,
  zeroHash
} from 'viem'

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const artifact = (name) => JSON.parse(fs.readFileSync(path.join(root, 'artifacts', 'solc', `${name}.json`), 'utf8'))
const launchpadAbi = artifact('StockCoinLaunchpad').abi
const factoryAbi = [{ type: 'function', stateMutability: 'view', name: 'factory', inputs: [], outputs: [{ type: 'address' }] }]

const required = (name) => {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}
const normalizeBytes32 = (name, value) => {
  if (!/^0x[0-9a-fA-F]{64}$/.test(value ?? '') || value.toLowerCase() === zeroHash) throw new Error(`${name} must be a nonzero bytes32`)
  return value.toLowerCase()
}

const rpcUrl = required('RPC_URL')
const chainId = Number(required('CHAIN_ID'))
const launchpad = required('LAUNCHPAD_ADDRESS')
const expectedCodeHash = normalizeBytes32('LAUNCHPAD_CODE_HASH', required('LAUNCHPAD_CODE_HASH'))
const expectedVersion = normalizeBytes32('LAUNCHPAD_PROTOCOL_VERSION', required('LAUNCHPAD_PROTOCOL_VERSION'))
if (!Number.isSafeInteger(chainId) || chainId <= 0) throw new Error('CHAIN_ID must be a positive safe integer')
if (!isAddress(launchpad) || launchpad.toLowerCase() === zeroAddress) throw new Error('LAUNCHPAD_ADDRESS must be a nonzero address')

const chain = defineChain({
  id: chainId,
  name: `Verified chain ${chainId}`,
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } }
})
const client = createPublicClient({ chain, transport: http(rpcUrl, { timeout: 20_000, retryCount: 1 }) })
const address = getAddress(launchpad)
const actualChainId = await client.getChainId()
if (actualChainId !== chainId) throw new Error(`RPC chain mismatch: expected ${chainId}, received ${actualChainId}`)
const code = await client.getBytecode({ address })
if (!code || code === '0x') throw new Error('Launchpad has no runtime bytecode')
const actualCodeHash = keccak256(code).toLowerCase()
const actualVersion = String(await client.readContract({ address, abi: launchpadAbi, functionName: 'PROTOCOL_VERSION' })).toLowerCase()

const fields = ['owner', 'guardian', 'liquidityLocker', 'creatorVestingVault', 'launchTokenDeployer', 'poolDeployer']
const values = Object.fromEntries(await Promise.all(fields.map(async (field) => [field, getAddress(await client.readContract({ address, abi: launchpadAbi, functionName: field }))])))
for (const [field, target] of Object.entries(values)) {
  if (target.toLowerCase() === zeroAddress) throw new Error(`${field} is zero`)
  const targetCode = field === 'owner' || field === 'guardian' ? null : await client.getBytecode({ address: target })
  if (targetCode !== null && (!targetCode || targetCode === '0x')) throw new Error(`${field} has no runtime bytecode`)
}
for (const field of ['liquidityLocker', 'creatorVestingVault', 'launchTokenDeployer', 'poolDeployer']) {
  const factory = getAddress(await client.readContract({ address: values[field], abi: factoryAbi, functionName: 'factory' }))
  if (factory.toLowerCase() !== address.toLowerCase()) throw new Error(`${field}.factory does not point to launchpad`)
}

const result = {
  generatedAt: new Date().toISOString(),
  rpcUrlRedacted: new URL(rpcUrl).origin,
  chainId,
  launchpad: address,
  trust: {
    expectedCodeHash,
    actualCodeHash,
    codeHashMatches: actualCodeHash === expectedCodeHash,
    expectedProtocolVersion: expectedVersion,
    actualProtocolVersion: actualVersion,
    protocolVersionMatches: actualVersion === expectedVersion
  },
  roles: { owner: values.owner, guardian: values.guardian },
  immutableComponents: {
    liquidityLocker: values.liquidityLocker,
    creatorVestingVault: values.creatorVestingVault,
    launchTokenDeployer: values.launchTokenDeployer,
    poolDeployer: values.poolDeployer
  },
  paused: await client.readContract({ address, abi: launchpadAbi, functionName: 'paused' }),
  complianceEnforced: await client.readContract({ address, abi: launchpadAbi, functionName: 'complianceEnforced' }),
  launchCount: String(await client.readContract({ address, abi: launchpadAbi, functionName: 'launchCount' }))
}
result.verified = result.trust.codeHashMatches && result.trust.protocolVersionMatches
if (!result.verified) {
  console.error(JSON.stringify(result, null, 2))
  process.exit(1)
}
const output = process.argv[2]
if (output) fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`)
console.log(JSON.stringify(result, null, 2))
