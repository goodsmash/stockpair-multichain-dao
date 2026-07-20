import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { loadGanache } from './lib/load-ganache.mjs'
import { createPublicClient, createWalletClient, defineChain, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { createChainScout } from '../services/indexer/src/scout.mjs'

const ganache = await loadGanache()

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const artifact = JSON.parse(fs.readFileSync(path.join(root, 'artifacts/solc/MockERC20.json'), 'utf8'))

test('Chain Scout detects a newly deployed ERC-20-like contract', async (context) => {
  const server = ganache.server({ logging: { quiet: true }, chain: { chainId: 31337, hardfork: 'shanghai' }, wallet: { deterministic: true } })
  await server.listen(18549)
  context.after(async () => { await server.close() })

  const initial = server.provider.getInitialAccounts()
  const [address, accountRecord] = Object.entries(initial)[0]
  const account = privateKeyToAccount(accountRecord.secretKey)
  const chain = defineChain({ id: 31337, name: 'Scout Local', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: ['http://127.0.0.1:18549'] } } })
  const publicClient = createPublicClient({ chain, transport: http('http://127.0.0.1:18549') })
  const walletClient = createWalletClient({ account, chain, transport: http('http://127.0.0.1:18549') })
  const hash = await walletClient.deployContract({ abi: artifact.abi, bytecode: artifact.bytecode, args: ['Scout Token', 'SCOUT', 18] })
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  assert.ok(receipt.contractAddress)
  assert.equal(account.address.toLowerCase(), address.toLowerCase())

  const scout = createChainScout({
    scoutEnabled: true,
    scoutPendingEnabled: false,
    scoutPollIntervalMs: 60_000,
    scoutInitialLookback: 10,
    scoutMaxBlocksPerPoll: 10,
    scoutMaxRecords: 100,
    scoutLabelsFile: path.join(root, 'config/scout-labels.example.json'),
    scoutDexFactories: [],
    scoutChains: [{ chainId: 31337, name: 'Scout Local', rpcUrl: 'http://127.0.0.1:18549', explorerUrl: null, wsUrl: null }]
  })
  await scout.poll()
  const summary = scout.summary()
  assert.ok(summary.counts.contracts >= 1)
  assert.ok(summary.counts.tokens >= 1)
  const token = scout.tokens({ limit: 10 }).find((item) => item.address.toLowerCase() === receipt.contractAddress.toLowerCase())
  assert.ok(token)
  assert.equal(token.token.symbol, 'SCOUT')
  assert.equal(token.token.decimals, 18)
  assert.equal(token.deployer.toLowerCase(), account.address.toLowerCase())
  assert.match(token.codeHash, /^0x[0-9a-f]{64}$/)

  const scan = await scout.scanAddress(31337, receipt.contractAddress)
  assert.equal(scan.token.symbol, 'SCOUT')
  assert.equal(scan.execution.autoExecutionAllowed, false)
  assert.equal(scan.execution.eligibleForReview, false)
  assert.ok(scan.execution.blockers.some((item) => item.includes('no live pool')))

  const recipient = Object.keys(initial)[1]
  const transferHash = await walletClient.writeContract({ address: receipt.contractAddress, abi: artifact.abi, functionName: 'approve', args: [recipient, 1n] })
  await publicClient.waitForTransactionReceipt({ hash: transferHash })
  await scout.poll()
  const updated = scout.contract(31337, receipt.contractAddress)
  assert.ok(updated.observedCallCount >= 1)
  assert.equal(updated.lastActivityBlock, (await publicClient.getBlockNumber()).toString())
  scout.stop()
})
