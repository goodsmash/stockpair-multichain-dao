export const BUILTIN_LAUNCH_SOURCES = Object.freeze([
  {
    id: 'stockpair-factory',
    family: 'factory-launch',
    chains: ['evm'],
    event: 'LaunchCreated(address,address,address,address,bytes32,uint256,uint256)',
    capabilities: ['launch', 'pool', 'lock', 'vesting', 'oracle-policy'],
    trust: 'configured-address-and-runtime-hash-required'
  },
  {
    id: 'generic-contract-creation',
    family: 'chain-native',
    chains: ['evm'],
    event: null,
    capabilities: ['contract-created', 'erc20-probe', 'runtime-hash', 'deployer-link'],
    trust: 'direct-block-and-receipt-evidence'
  },
  {
    id: 'uniswap-v2-factory',
    family: 'amm-pool',
    chains: ['evm'],
    event: 'PairCreated(address,address,address,uint256)',
    capabilities: ['pool-created', 'swap-observed'],
    trust: 'factory-address-allowlist-required'
  },
  {
    id: 'uniswap-v3-factory',
    family: 'amm-pool',
    chains: ['evm'],
    event: 'PoolCreated(address,address,uint24,int24,address)',
    capabilities: ['pool-created', 'fee-tier', 'swap-observed'],
    trust: 'factory-address-allowlist-required'
  },
  {
    id: 'uniswap-v4-pool-manager',
    family: 'singleton-amm',
    chains: ['evm'],
    event: 'Initialize(bytes32,address,address,uint24,int24,address,uint160,int24)',
    capabilities: ['pool-initialized', 'hook-address', 'dynamic-fee', 'swap-observed'],
    trust: 'pool-manager-and-hook-risk-policy-required'
  },
  {
    id: 'constant-product-bonding-curve',
    family: 'bonding-curve',
    chains: ['evm'],
    event: null,
    capabilities: ['curve-progress', 'virtual-reserves', 'graduation-threshold', 'amm-migration'],
    trust: 'adapter-specific-factory-and-event-schema-required'
  },
  {
    id: 'liquidity-bootstrapping-pool',
    family: 'weighted-auction',
    chains: ['evm'],
    event: null,
    capabilities: ['weight-schedule', 'start-end-time', 'min-max-raise', 'price-discovery'],
    trust: 'vault-and-pool-factory-allowlist-required'
  }
])

export function createLaunchSourceRegistry(extra = []) {
  const sources = new Map()
  for (const source of [...BUILTIN_LAUNCH_SOURCES, ...extra]) {
    if (!source || typeof source.id !== 'string' || !/^[a-z0-9][a-z0-9-]{2,79}$/.test(source.id)) throw new Error('invalid launch source id')
    if (sources.has(source.id)) throw new Error(`duplicate launch source: ${source.id}`)
    sources.set(source.id, Object.freeze({ ...source, capabilities: Object.freeze([...(source.capabilities ?? [])]) }))
  }
  return Object.freeze({
    list: () => [...sources.values()],
    get: (id) => sources.get(id) ?? null,
    has: (id) => sources.has(id)
  })
}
