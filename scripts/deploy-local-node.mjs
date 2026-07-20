import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  encodeFunctionData,
  getAddress,
  http,
  keccak256,
  maxUint256,
  parseUnits
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const artifact = (name) => JSON.parse(fs.readFileSync(path.join(root, 'artifacts', 'solc', `${name}.json`), 'utf8'))
const A = { Launchpad: artifact('StockCoinLaunchpad'), Stock: artifact('MockStrictStockToken'), Feed: artifact('MockAggregatorV3'), Gate: artifact('MockEligibilityGate') }
const LOCAL_TRANSACTION_DEADLINE_SECONDS = 20n * 60n
const ticker = (value) => `0x${Buffer.from(value).toString('hex').padEnd(64, '0')}`

export async function deployLocalNode({ rpcUrl = 'http://127.0.0.1:8545', chainId = 31337, privateKey } = {}) {
  const chain = defineChain({ id: chainId, name: 'StockPair Local', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [rpcUrl] } } })
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) })
  const addresses = await publicClient.request({ method: 'eth_accounts' })
  if (!addresses[0] || !addresses[1]) throw new Error('Local RPC must expose at least two unlocked accounts')
  const owner = getAddress(addresses[0]); const trader = getAddress(addresses[1])
  if (!privateKey) throw new Error('Local deployment requires an in-memory Ganache test signer')
  const signer = privateKeyToAccount(privateKey)
  if (signer.address.toLowerCase() !== owner.toLowerCase()) throw new Error('Local signer does not match the first RPC account')
  const wallet = createWalletClient({ account: signer, chain, transport: http(rpcUrl) })

  async function deploy(item, args) {
    const hash = await wallet.deployContract({ account: signer, abi: item.abi, bytecode: item.bytecode, args, chain })
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    if (receipt.status !== 'success' || !receipt.contractAddress) throw new Error('Local deployment failed')
    return getAddress(receipt.contractAddress)
  }
  async function write(address, item, functionName, args = []) {
    const simulation = await publicClient.simulateContract({ account: signer, address, abi: item.abi, functionName, args })
    const hash = await wallet.writeContract(simulation.request)
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    if (receipt.status !== 'success') throw new Error(`${functionName} failed`)
    return hash
  }

  const stock = await deploy(A.Stock, ['Mock Robinhood Stock Token', 'MRH', owner, parseUnits('1000000', 18)])
  const feed = await deploy(A.Feed, [8, 10_000_000_000n])
  const gate = await deploy(A.Gate, [])
  const launchpad = await deploy(A.Launchpad, [owner, owner])
  await write(gate, A.Gate, 'setEligible', [owner, true]); await write(gate, A.Gate, 'setEligible', [trader, true])
  await write(stock, A.Stock, 'transfer', [trader, parseUnits('10000', 18)])
  const actions = [
    { functionName: 'setCompliance', args: [gate, true] },
    { functionName: 'configureStock', args: [stock, feed, ticker('MRH'), 4 * 24 * 60 * 60, parseUnits('1000', 18), true, true] }
  ]
  for (const action of actions) {
    const data = encodeFunctionData({ abi: A.Launchpad.abi, functionName: action.functionName, args: action.args })
    await write(launchpad, A.Launchpad, 'scheduleAdminAction', [data])
  }
  await publicClient.request({ method: 'evm_increaseTime', params: [48 * 60 * 60 + 1] })
  await publicClient.request({ method: 'evm_mine', params: [] })
  for (const action of actions) await write(launchpad, A.Launchpad, action.functionName, action.args)
  await write(stock, A.Stock, 'approve', [launchpad, maxUint256])
  const block = await publicClient.getBlock()
  await write(launchpad, A.Launchpad, 'launch', [{
    name: 'Sherwood Demo Coin', symbol: 'SHWD', metadataHash: `0x${'11'.repeat(32)}`, stockToken: stock,
    totalCoinSupply: parseUnits('1000000', 18), poolCoinAmount: parseUnits('900000', 18), creatorCoinAmount: parseUnits('100000', 18),
    stockAmount: parseUnits('100', 18), feeBps: 30, liquidityLockDuration: 365 * 24 * 60 * 60, minInitialLiquidity: 1n,
    deadline: block.timestamp + LOCAL_TRANSACTION_DEADLINE_SECONDS
  }])
  const record = await publicClient.readContract({ address: launchpad, abi: A.Launchpad.abi, functionName: 'launchAt', args: [0n] })
  const code = await publicClient.getBytecode({ address: launchpad })
  const launchpadCodeHash = keccak256(code)
  const protocolVersion = await publicClient.readContract({ address: launchpad, abi: A.Launchpad.abi, functionName: 'PROTOCOL_VERSION' })

  const deployment = { chainId, rpcUrl, owner, fundedTrader: trader, launchpad, launchpadCodeHash, protocolVersion, stock, feed, gate, pool: record.pool, coin: record.coinToken, createdAt: new Date().toISOString() }
  fs.mkdirSync(path.join(root, 'deployments'), { recursive: true })
  fs.writeFileSync(path.join(root, 'deployments', 'local.json'), `${JSON.stringify(deployment, null, 2)}\n`)
  fs.writeFileSync(path.join(root, 'apps', 'web', '.env.local'), [
    `VITE_CHAIN_ID=${chainId}`, 'VITE_CHAIN_NAME=StockPair Local', `VITE_RPC_URL=${rpcUrl}`,
    'VITE_EXPLORER_URL=http://127.0.0.1:8545', `VITE_LAUNCHPAD_ADDRESS=${launchpad}`,
    `VITE_LAUNCHPAD_CODE_HASH=${launchpadCodeHash}`, `VITE_LAUNCHPAD_PROTOCOL_VERSION=${protocolVersion}`,
    'VITE_INDEXER_URL=http://127.0.0.1:8787', 'VITE_ENABLE_OPERATIONS=false', ''
  ].join('\n'))
  return deployment
}

if (import.meta.url === `file://${process.argv[1]}`) {
  deployLocalNode({ rpcUrl: process.env.RPC_URL, chainId: Number(process.env.CHAIN_ID ?? 31337), privateKey: process.env.LOCAL_TEST_PRIVATE_KEY })
    .then((deployment) => console.log(JSON.stringify(deployment, null, 2)))
    .catch((error) => { console.error(error); process.exit(1) })
}
