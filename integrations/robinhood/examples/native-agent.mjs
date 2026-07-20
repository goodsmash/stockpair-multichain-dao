import { RobinhoodChainKitClient } from '../../../packages/robinhood-chain-kit/src/index.js'

const baseUrl = process.env.STOCKPAIR_INDEXER_URL ?? 'http://127.0.0.1:8787'
const client = new RobinhoodChainKitClient({ baseUrl })
const [capabilities, network, contracts, gas, node] = await Promise.all([
  client.getCapabilities(),
  client.getNetwork(),
  client.getContracts(),
  client.getGas(),
  client.getNodeProfile()
])

const review = {
  generatedAt: new Date().toISOString(),
  readOnly: capabilities.safety?.readOnly === true,
  knownNetwork: network.known === true,
  productionReadyRpc: network.productionReadyRpc === true,
  reviewedAt: network.reviewedAt,
  contractRegistryKnown: contracts.known === true,
  gasPriceWei: gas.gasPriceWei,
  nodeAutoUpgradeAllowed: node.autoUpgradeAllowed,
  blockers: [
    ...(network.known ? [] : ['chain is absent from the reviewed Robinhood registry']),
    ...(network.productionReadyRpc ? [] : ['RPC is shared/demo infrastructure']),
    ...(contracts.known ? [] : ['protocol contract registry is unavailable'])
  ]
}

process.stdout.write(`${JSON.stringify(review, null, 2)}\n`)
