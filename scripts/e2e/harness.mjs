import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadGanache } from '../lib/load-ganache.mjs'
import { createPublicClient, createWalletClient, custom, defineChain, encodeFunctionData, getAddress, parseUnits } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const ganache = await loadGanache()

const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)))
const artifact = (name) => JSON.parse(fs.readFileSync(path.join(root, 'artifacts', 'solc', `${name}.json`), 'utf8'))

export const A = {
  Launchpad: artifact('StockCoinLaunchpad'),
  Pool: artifact('StockCoinPool'),
  Token: artifact('LaunchToken'),
  Stock: artifact('MockStrictStockToken'),
  DangerousStock: artifact('MockDangerousStockToken'),
  DelegateProxy: artifact('MockDelegateProxy'),
  Feed: artifact('MockAggregatorV3'),
  Gate: artifact('MockEligibilityGate'),
  EligibilityGate: artifact('AttestedEligibilityGate'),
  FeeToken: artifact('MockFeeOnTransferToken'),
  ReentrantToken: artifact('MockReentrantStockToken'),
  Locker: artifact('LiquidityLocker'),
  Vesting: artifact('CreatorVestingVault'),
  PolicyHarness: artifact('BytecodePolicyHarness'),
  InvalidOpcodeBypass: artifact('MockInvalidOpcodeBypass'),
  ExecutableMetadataBypass: artifact('MockExecutableMetadataBypass')
}

const chain = defineChain({
  id: 31337,
  name: 'Ganache',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['http://127.0.0.1'] } }
})

export const ADMIN_DELAY = 48 * 60 * 60
export const YEAR = 365 * 24 * 60 * 60
export const ticker = (value) => `0x${Buffer.from(value).toString('hex').padEnd(64, '0')}`
export const deadline = async (h) => (await h.publicClient.getBlock()).timestamp + 20n * 60n
export const looseDeadline = async (h) => (await h.publicClient.getBlock()).timestamp + 31n * 60n
export const tightMin = (value, slippageBps = 100n) => value * (10_000n - slippageBps) / 10_000n

export async function launchParams(h, stockToken, symbol = 'ALC', name = 'Agent Launch Coin') {
  return {
    name,
    symbol,
    metadataHash: `0x${'11'.repeat(32)}`,
    stockToken,
    totalCoinSupply: parseUnits('1000000', 18),
    poolCoinAmount: parseUnits('900000', 18),
    creatorCoinAmount: parseUnits('100000', 18),
    stockAmount: parseUnits('100', 18),
    feeBps: 30,
    liquidityLockDuration: YEAR,
    minInitialLiquidity: 1n,
    deadline: await deadline(h)
  }
}

export async function expectReject(action, message) {
  await assert.rejects(action, undefined, message)
}

export function createHarness() {
  const provider = ganache.provider({
    logging: { quiet: true },
    wallet: { deterministic: true, totalAccounts: 8 },
    chain: { chainId: 31337, hardfork: 'shanghai' },
    miner: { blockGasLimit: 40_000_000 }
  })
  const privateKeys = Object.values(provider.getInitialAccounts()).map((entry) => entry.secretKey)
  const accounts = privateKeys.map((key) => privateKeyToAccount(key))
  const [owner, alice, bob, guardian, attacker] = accounts
  const publicClient = createPublicClient({ chain, transport: custom(provider), pollingInterval: 10 })
  const nonces = new Map(accounts.map((account) => [account.address.toLowerCase(), 0]))
  const takeNonce = (account) => nonces.get(account.address.toLowerCase()) ?? 0
  const commitNonce = (account) => nonces.set(account.address.toLowerCase(), takeNonce(account) + 1)
  const wallet = (account) => createWalletClient({ account, chain, transport: custom(provider) })

  async function deploy(name, args, account = owner) {
    const item = A[name]
    const hash = await wallet(account).deployContract({ abi: item.abi, bytecode: item.bytecode, args, gas: 30_000_000n, nonce: takeNonce(account) })
    commitNonce(account)
    const receipt = await publicClient.waitForTransactionReceipt({ hash, pollingInterval: 10, timeout: 30_000 })
    assert.equal(receipt.status, 'success', `${name} deployment failed`)
    return getAddress(receipt.contractAddress)
  }

  async function write(account, address, item, functionName, args = []) {
    const hash = await wallet(account).writeContract({ address, abi: item.abi, functionName, args, gas: 30_000_000n, nonce: takeNonce(account) })
    commitNonce(account)
    const receipt = await publicClient.waitForTransactionReceipt({ hash, pollingInterval: 10, timeout: 30_000 })
    if (receipt.status !== 'success') throw new Error(`${functionName} reverted`)
    return receipt
  }

  return {
    provider,
    publicClient,
    accounts: { owner, alice, bob, guardian, attacker },
    deploy,
    write,
    increaseTime: async (seconds) => {
      await provider.request({ method: 'evm_increaseTime', params: [seconds] })
      await provider.request({ method: 'evm_mine', params: [] })
    },
    close: async () => { await provider.disconnect() }
  }
}

export async function scheduleActions(h, launchpad, actions, account = h.accounts.owner) {
  for (const action of actions) {
    const callData = encodeFunctionData({ abi: A.Launchpad.abi, functionName: action.functionName, args: action.args })
    await h.write(account, launchpad, A.Launchpad, 'scheduleAdminAction', [callData])
  }
  await h.increaseTime(ADMIN_DELAY + 1)
  for (const action of actions) await h.write(account, launchpad, A.Launchpad, action.functionName, action.args)
}

export async function configureStock(h, launchpad, stock, feed, tickerValue, { maxAge = 4 * 24 * 60 * 60, minimumUsd18 = parseUnits('1000', 18), enabled = true, requireFresh = true } = {}) {
  const args = [stock, feed, ticker(tickerValue), maxAge, minimumUsd18, enabled, requireFresh]
  await scheduleActions(h, launchpad, [{ functionName: 'configureStock', args }])
}

export async function deployBase(h, { compliance = true, tickerValue = 'RHM' } = {}) {
  const { owner, alice, bob, guardian } = h.accounts
  const stock = await h.deploy('Stock', [`${tickerValue} Mock Stock`, tickerValue, owner.address, parseUnits('1000000', 18)])
  const feed = await h.deploy('Feed', [8, 25_000_000_000n])
  const gate = await h.deploy('Gate', [])
  const launchpad = await h.deploy('Launchpad', [owner.address, guardian.address])
  for (const user of [owner, alice, bob]) await h.write(owner, gate, A.Gate, 'setEligible', [user.address, true])
  await h.write(owner, stock, A.Stock, 'transfer', [alice.address, parseUnits('10000', 18)])
  await h.write(owner, stock, A.Stock, 'transfer', [bob.address, parseUnits('10000', 18)])
  const actions = [{ functionName: 'configureStock', args: [stock, feed, ticker(tickerValue), 4 * 24 * 60 * 60, parseUnits('1000', 18), true, true] }]
  if (compliance) actions.unshift({ functionName: 'setCompliance', args: [gate, true] })
  await scheduleActions(h, launchpad, actions)
  return { stock, feed, gate, launchpad }
}
