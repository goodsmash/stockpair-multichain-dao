import { getAddress, isAddress, parseAbi, zeroAddress } from 'viem'
import { robinhoodNetwork } from './registry.mjs'
import { publicEndpointLabel } from '../security/public-endpoint.mjs'

const HASH = /^0x[0-9a-fA-F]{64}$/
const HEX_DATA = /^0x(?:[0-9a-fA-F]{2})*$/
const ERC8056_ABI = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function uiMultiplier() view returns (uint256)',
  'function newUIMultiplier() view returns (uint256)',
  'function effectiveAt() view returns (uint256)',
  'function balanceOfUI(address) view returns (uint256)',
  'function totalSupplyUI() view returns (uint256)',
  'function oraclePaused() view returns (bool)'
])
const FEED_ABI = parseAbi([
  'function latestRoundData() view returns (uint80 roundId,int256 answer,uint256 startedAt,uint256 updatedAt,uint80 answeredInRound)',
  'function decimals() view returns (uint8)'
])

function asString(value) { return typeof value === 'bigint' ? value.toString() : value }
function int(value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback
}
function numericString(value, fallback = '0') {
  const text = String(value ?? '')
  return /^\d{1,100}$/.test(text) ? text : fallback
}
function address(value, name, { optional = false } = {}) {
  if ((value === undefined || value === null || value === '') && optional) return null
  if (!isAddress(value)) throw new Error(`${name} must be a valid address`)
  return getAddress(value)
}
function data(value, name = 'data') {
  const text = String(value ?? '0x')
  if (!HEX_DATA.test(text) || text.length > 131_074) throw new Error(`${name} must be bounded even-length hex data`)
  return text.toLowerCase()
}
async function safeRead(client, request, fallback = null) {
  try { return await client.readContract(request) } catch { return fallback }
}
function publicRpcHost(url) {
  try { return new URL(url).hostname.toLowerCase() } catch { return '' }
}
function isSharedRobinhoodRpc(url) {
  return ['rpc.mainnet.chain.robinhood.com', 'rpc.testnet.chain.robinhood.com'].includes(publicRpcHost(url))
}

export function buildBoundedAaPolicy(input = {}) {
  const entryPointVersion = ['0.6', '0.7', '0.8'].includes(input.entryPointVersion) ? input.entryPointVersion : '0.8'
  const enabled = input.enabled === true
  const allowedTargets = Array.isArray(input.allowedTargets) ? [...new Set(input.allowedTargets.map((item) => address(item, 'allowed target')))] : []
  const allowedSelectors = Array.isArray(input.allowedSelectors)
    ? [...new Set(input.allowedSelectors.map((item) => String(item).toLowerCase()).filter((item) => /^0x[0-9a-f]{8}$/.test(item)))]
    : []
  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null
  if (enabled && (!expiresAt || Number.isNaN(expiresAt.valueOf()) || expiresAt.valueOf() <= Date.now())) throw new Error('enabled session policy requires a future expiry')
  if (enabled && (!allowedTargets.length || !allowedSelectors.length)) throw new Error('enabled session policy requires target and selector allowlists')
  const maxValuePerCall = numericString(input.maxValuePerCall)
  const maxTotalValue = numericString(input.maxTotalValue)
  if (enabled && (maxValuePerCall === '0' || maxTotalValue === '0')) throw new Error('enabled session policy requires non-zero value caps')
  return {
    version: '1.0',
    entryPointVersion,
    userSignatureRequired: true,
    privateKeyStorageAllowed: false,
    paymasterPolicyRequired: true,
    session: {
      enabled,
      expiresAt: expiresAt?.toISOString() ?? null,
      allowedTargets,
      allowedSelectors,
      maxValuePerCall,
      maxTotalValue,
      revocationRequired: true
    }
  }
}

export function buildCrossChainMessagePlan(network, input = {}) {
  if (!network) throw new Error('Robinhood network is unavailable')
  const direction = input.direction
  if (!['l1-to-l2', 'l2-to-l1'].includes(direction)) throw new Error('direction must be l1-to-l2 or l2-to-l1')
  const target = address(input.target, 'target')
  const calldata = data(input.data)
  const plan = {
    version: '1.0', direction, chainId: network.chainId, unsigned: true, userSignatureRequired: true,
    target, data: calldata, steps: [], warnings: [], contracts: {}
  }
  if (direction === 'l1-to-l2') {
    const from = address(input.from, 'from', { optional: true })
    plan.contracts = { delayedInbox: network.contracts.l1.delayedInbox, bridge: network.contracts.l1.bridge }
    plan.steps = [
      { order: 1, layer: 'L1', action: 'estimate-retryable-ticket', sdk: '@arbitrum/sdk ParentToChildMessageCreator', requiresSigner: false },
      { order: 2, layer: 'L1', action: 'submit-retryable-ticket', sdk: '@arbitrum/sdk ParentToChildMessageCreator.createRetryableTicket', requiresSigner: true, parameters: { to: target, data: calldata, from, l2CallValue: numericString(input.l2CallValue) } },
      { order: 3, layer: 'L2', action: 'monitor-or-manually-redeem', deadlineSeconds: 604800, requiresSigner: true }
    ]
    plan.warnings = [
      'L1 contract callers are address-aliased on L2; access control must verify the aliased sender.',
      'Estimate retryable gas immediately before submission and never hard-code gas parameters.',
      'A failed L2 execution must be monitored and manually redeemed within the retryable lifetime.'
    ]
  } else {
    plan.contracts = { arbSys: '0x0000000000000000000000000000000000000064', outbox: network.contracts.l1.outbox }
    plan.steps = [
      { order: 1, layer: 'L2', action: 'send-message-to-l1', contract: plan.contracts.arbSys, function: 'sendTxToL1(address,bytes)', requiresSigner: true, parameters: { destination: target, data: calldata } },
      { order: 2, layer: 'L1', action: 'wait-for-challenge-period', minimumSeconds: network.finality.canonicalWithdrawalChallengeSeconds, requiresSigner: false },
      { order: 3, layer: 'L1', action: 'execute-through-outbox', contract: plan.contracts.outbox, sdk: '@arbitrum/sdk ChildTransactionReceipt', requiresSigner: true }
    ]
    plan.warnings = [
      'L2-to-L1 execution is a two-transaction workflow and cannot complete before the challenge period.',
      'The L1 execution transaction must be performed after the message is ready in the Outbox.',
      'Do not treat L2 initiation as completion of the L1 action.'
    ]
  }
  return plan
}

export function createRobinhoodNativeIntegration({ client, config, registry }) {
  const network = robinhoodNetwork(registry, config.chainId)

  function model() {
    return {
      softConfirmation: { typical: network?.finality.softConfirmationTypical ?? 'unknown', safeForEverydayUx: true, safeForHighValue: false },
      postedToEthereum: { typical: network?.finality.ethereumPostingTypical ?? 'unknown', orderingFixed: true },
      ethereumFinality: { typical: network?.finality.ethereumFinalityTypical ?? 'unknown', safeForHighValue: true },
      withdrawalChallengeSeconds: network?.finality.canonicalWithdrawalChallengeSeconds ?? 604800
    }
  }

  async function finality(transactionHash = null) {
    const base = { chainId: config.chainId, model: model(), transaction: { status: 'not-requested', safeForHighValue: false } }
    if (!transactionHash) return base
    if (!HASH.test(transactionHash)) throw new Error('transaction hash must be 32-byte hex')
    const receipt = await client.getTransactionReceipt({ hash: transactionHash }).catch(() => null)
    if (!receipt) return { ...base, transaction: { hash: transactionHash.toLowerCase(), status: 'not-found', safeForHighValue: false } }
    if (receipt.status !== 'success') return { ...base, transaction: { hash: transactionHash.toLowerCase(), status: 'reverted', blockNumber: receipt.blockNumber.toString(), safeForHighValue: false } }
    const finalized = await client.getBlock({ blockTag: 'finalized' }).catch(() => null)
    const ethereumFinalized = Boolean(finalized && finalized.number !== null && finalized.number >= receipt.blockNumber)
    return {
      ...base,
      transaction: {
        hash: transactionHash.toLowerCase(),
        status: ethereumFinalized ? 'ethereum-finalized' : 'soft-confirmed',
        blockNumber: receipt.blockNumber.toString(),
        finalizedBlockNumber: finalized?.number?.toString() ?? null,
        postedToEthereum: ethereumFinalized ? true : null,
        safeForHighValue: ethereumFinalized,
        limitation: ethereumFinalized ? null : 'This conservative endpoint does not infer L1 batch posting before the provider exposes the transaction under the finalized tag.'
      }
    }
  }

  async function gas() {
    const gasPrice = await client.getGasPrice().catch(() => 0n)
    return {
      chainId: config.chainId,
      gasPriceWei: gasPrice.toString(),
      nativeCurrency: network?.nativeCurrency ?? { name: 'Ether', symbol: 'ETH', decimals: 18 },
      feeComponents: ['L2 execution fee', 'L1 data availability fee'],
      estimation: 'Use eth_estimateGas immediately before signing; wallet estimates include both fee components.',
      optimization: ['minimize calldata', 'batch operations only under a reviewed account-abstraction policy', 'avoid storing redundant launch metadata onchain'],
      precompiles: { ArbGasInfo: registry.precompiles.ArbGasInfo, NodeInterface: registry.precompiles.NodeInterface }
    }
  }

  async function stockTokenSnapshot(input = {}) {
    const token = address(input.token, 'token')
    const feed = address(input.feed, 'feed', { optional: true })
    const sequencerFeed = address(input.sequencerFeed, 'sequencer feed', { optional: true })
    const wallet = address(input.wallet, 'wallet', { optional: true })
    const heartbeatSeconds = int(input.heartbeatSeconds, 0, 1, 604800)
    const gracePeriodSeconds = int(input.gracePeriodSeconds, 3600, 0, 86400)
    const now = BigInt(Math.floor(Date.now() / 1000))
    const [name, symbol, decimals, totalSupply, uiMultiplier, newUIMultiplier, effectiveAt, totalSupplyUI, oraclePaused, balance, balanceUI] = await Promise.all([
      safeRead(client, { address: token, abi: ERC8056_ABI, functionName: 'name' }),
      safeRead(client, { address: token, abi: ERC8056_ABI, functionName: 'symbol' }),
      safeRead(client, { address: token, abi: ERC8056_ABI, functionName: 'decimals' }),
      safeRead(client, { address: token, abi: ERC8056_ABI, functionName: 'totalSupply' }),
      safeRead(client, { address: token, abi: ERC8056_ABI, functionName: 'uiMultiplier' }),
      safeRead(client, { address: token, abi: ERC8056_ABI, functionName: 'newUIMultiplier' }),
      safeRead(client, { address: token, abi: ERC8056_ABI, functionName: 'effectiveAt' }),
      safeRead(client, { address: token, abi: ERC8056_ABI, functionName: 'totalSupplyUI' }),
      safeRead(client, { address: token, abi: ERC8056_ABI, functionName: 'oraclePaused' }),
      wallet ? safeRead(client, { address: token, abi: ERC8056_ABI, functionName: 'balanceOf', args: [wallet] }) : null,
      wallet ? safeRead(client, { address: token, abi: ERC8056_ABI, functionName: 'balanceOfUI', args: [wallet] }) : null
    ])
    let oracle = null
    if (feed) {
      const [round, feedDecimals] = await Promise.all([
        safeRead(client, { address: feed, abi: FEED_ABI, functionName: 'latestRoundData' }),
        safeRead(client, { address: feed, abi: FEED_ABI, functionName: 'decimals' })
      ])
      if (round && feedDecimals !== null) {
        const ageSeconds = round[3] > 0n && now >= round[3] ? Number(now - round[3]) : null
        oracle = {
          feed, roundId: asString(round[0]), answer: asString(round[1]), decimals: Number(feedDecimals), startedAt: asString(round[2]), updatedAt: asString(round[3]), answeredInRound: asString(round[4]),
          heartbeatSeconds: heartbeatSeconds || null,
          ageSeconds,
          validAnswer: round[1] > 0n && round[3] > 0n,
          fresh: heartbeatSeconds > 0 && ageSeconds !== null ? ageSeconds <= heartbeatSeconds : false,
          schedule: '24/5 following market hours',
          multiplierAlreadyApplied: true
        }
      }
    }
    let sequencer = null
    if (sequencerFeed) {
      const round = await safeRead(client, { address: sequencerFeed, abi: FEED_ABI, functionName: 'latestRoundData' })
      if (round) {
        const up = round[1] === 0n
        const recoveryAge = round[2] > 0n && now >= round[2] ? Number(now - round[2]) : null
        sequencer = { feed: sequencerFeed, up, startedAt: asString(round[2]), recoveryAgeSeconds: recoveryAge, gracePeriodSeconds, graceElapsed: up && recoveryAge !== null && recoveryAge > gracePeriodSeconds }
      }
    }
    const blockers = []
    if (!feed) blockers.push('price feed is not configured from the current Chainlink registry')
    else if (!oracle) blockers.push('price feed is unreadable')
    else {
      if (!oracle.validAnswer) blockers.push('oracle answer is zero, negative, or incomplete')
      if (!heartbeatSeconds) blockers.push('feed heartbeat is not configured')
      else if (!oracle.fresh) blockers.push('oracle answer is stale')
    }
    if (oraclePaused === true) blockers.push('token reports oraclePaused during a corporate-action window')
    if (!sequencerFeed) blockers.push('sequencer uptime feed is not configured')
    else if (!sequencer) blockers.push('sequencer uptime feed is unreadable')
    else if (!sequencer.up) blockers.push('sequencer is down')
    else if (!sequencer.graceElapsed) blockers.push('sequencer recovery grace period has not elapsed')
    if (uiMultiplier === null) blockers.push('ERC-8056 uiMultiplier is unreadable')
    return {
      chainId: config.chainId,
      token: { address: token, name, symbol, decimals: decimals === null ? null : Number(decimals), totalSupply: asString(totalSupply), wallet, balance: asString(balance), balanceUI: asString(balanceUI) },
      corporateAction: {
        uiMultiplier: asString(uiMultiplier), newUIMultiplier: asString(newUIMultiplier), effectiveAt: asString(effectiveAt), totalSupplyUI: asString(totalSupplyUI), oraclePaused,
        pendingChange: Boolean(newUIMultiplier !== null && uiMultiplier !== null && newUIMultiplier !== uiMultiplier && effectiveAt !== null && effectiveAt > now)
      },
      oracle, sequencer,
      execution: { eligible: blockers.length === 0, blockers, requiredChecks: ['canonical token address', 'current feed registry entry', 'heartbeat staleness', 'sequencer uptime and grace period', 'oraclePaused', 'corporate-action multiplier state'] },
      displayRules: { tokenPrice: 'use feed answer directly', underlyingSharePrice: 'feedPrice * 1e18 / uiMultiplier', shareEquivalentUnits: 'rawBalance * uiMultiplier / 1e18' }
    }
  }

  return Object.freeze({
    capabilities: () => ({
      version: '0.9.0', chainId: config.chainId, knownRobinhoodNetwork: Boolean(network),
      modules: [
        'reviewed-network-and-contract-registry', 'erc-8056-stock-token-snapshots', 'oracle-and-sequencer-safety', 'conservative-finality-tracking',
        'unsigned-cross-chain-message-plans', 'canonical-bridge-routing-metadata', 'erc-4337-and-eip-7702-policy-descriptors', 'gas-and-node-posture'
      ],
      safety: { readOnly: true, signingKeysAccepted: false, transactionBroadcasting: false, autoExecutionAllowed: false }
    }),
    network: () => ({
      registryVersion: registry.schemaVersion, reviewedAt: registry.reviewedAt, known: Boolean(network), profile: network,
      configuredEndpoint: publicEndpointLabel(config.rpcUrl), publicSharedRpc: isSharedRobinhoodRpc(config.rpcUrl),
      productionReadyRpc: !isSharedRobinhoodRpc(config.rpcUrl), expectedArbOsVersion: config.expectedArbOsVersion ?? network?.arbitrum.documentedArbOsVersion ?? null,
      warnings: [
        ...(isSharedRobinhoodRpc(config.rpcUrl) ? ['Configured RPC is an official public shared endpoint; do not use it for production latency-sensitive workloads.'] : []),
        'Revalidate this reviewed registry against the official Robinhood documentation before every production deployment.'
      ]
    }),
    contracts: () => ({ chainId: config.chainId, known: Boolean(network), contracts: network?.contracts ?? null, precompiles: registry.precompiles, tokens: network?.tokens ?? null, reviewedAt: registry.reviewedAt }),
    accountAbstraction: (policy = {}) => ({ chainId: config.chainId, network: network?.accountAbstraction ?? null, providers: ['Alchemy', 'ZeroDev', 'Privy'], policy: buildBoundedAaPolicy(policy), warnings: ['Never embed a private key in a browser or agent service.', 'Paymaster sponsorship must use explicit target, selector, spend, rate, and expiry policies.', 'Session keys require immediate revocation and must not authorize arbitrary calls.'] }),
    finality,
    gas,
    stockTokenSnapshot,
    messagePlan: (input) => buildCrossChainMessagePlan(network, input),
    bridgePlan: (input = {}) => {
      if (!network) throw new Error('Robinhood network is unavailable')
      const direction = input.direction === 'l2-to-l1' ? 'l2-to-l1' : 'l1-to-l2'
      const token = address(input.token, 'token', { optional: true })
      return {
        version: '1.0', chainId: network.chainId, direction, unsigned: true, userSignatureRequired: true, token,
        canonical: {
          l1GatewayRouter: network.contracts.l1.gatewayRouter, l2GatewayRouter: network.contracts.l2.gatewayRouter,
          expectedTiming: direction === 'l1-to-l2' ? 'approximately 10 minutes under normal conditions' : '7-day challenge period plus L1 claim transaction'
        },
        steps: direction === 'l1-to-l2'
          ? ['resolve canonical L2 token address through the gateway router', 'estimate retryable ticket immediately before signing', 'submit L1 deposit', 'monitor and redeem the L2 retryable if necessary']
          : ['initiate L2 withdrawal', 'wait for the challenge period', 'prove/execute the L1 outbox claim'],
        blockers: token ? [] : ['token address is required for an asset-specific bridge plan'],
        warnings: ['Bridged ERC-20 addresses differ between L1 and L2.', 'Third-party fast bridges have different trust and liquidity assumptions and are not represented as canonical.']
      }
    },
    node: () => ({
      chainId: config.chainId, documentedArbOsVersion: network?.arbitrum.documentedArbOsVersion ?? null, expectedArbOsVersion: config.expectedArbOsVersion ?? null,
      documentedNitroImage: network?.arbitrum.documentedNitroImage ?? null, sequencerFeedUrl: network?.sequencerFeedUrl ?? null,
      resources: { cpu: '8+ modern cores', memory: '64 GB minimum; 128 GB recommended', storage: 'locally attached NVMe with chain-size growth buffer', parentDependencies: ['L1 execution RPC', 'L1 beacon endpoint'] },
      requiredChecks: ['monitor official notices and upgrades', 'verify chain-info and genesis files', 'verify Nitro and ArbOS compatibility before activation', 'monitor eth_syncing and node health', 'keep public HTTP APIs limited to net, web3, eth'],
      autoUpgradeAllowed: false
    })
  })
}
