import { getAddress, isAddress, parseEther } from 'viem'

const address = process.argv[2]
const amount = process.argv[3] ?? '100'
if (!address || !isAddress(address)) {
  console.error('Usage: node scripts/fund-local-wallet.mjs 0xWALLET [ETH_AMOUNT]')
  process.exit(1)
}
const rpcUrl = process.env.RPC_URL ?? 'http://127.0.0.1:8545'
async function rpc(method, params) {
  const response = await fetch(rpcUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) })
  const data = await response.json()
  if (data.error) throw new Error(data.error.message)
  return data.result
}
const accounts = await rpc('eth_accounts', [])
if (!accounts[0]) throw new Error('No unlocked local account')
const hash = await rpc('eth_sendTransaction', [{ from: accounts[0], to: getAddress(address), value: `0x${parseEther(amount).toString(16)}` }])
console.log(`Funded ${getAddress(address)} with ${amount} local ETH: ${hash}`)
