import { defineChain } from 'viem'

const chainId = Number(import.meta.env.VITE_CHAIN_ID ?? '46630')
const rpcUrl = import.meta.env.VITE_RPC_URL ?? 'https://rpc.testnet.chain.robinhood.com'
const explorerUrl = import.meta.env.VITE_EXPLORER_URL ?? 'https://explorer.testnet.chain.robinhood.com'

export const robinhoodChain = defineChain({
  id: chainId,
  name: import.meta.env.VITE_CHAIN_NAME ?? 'Robinhood Chain Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
  blockExplorers: { default: { name: 'Robinhood Explorer', url: explorerUrl } }
})
