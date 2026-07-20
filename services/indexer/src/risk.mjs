import {
  createPublicClient,
  getAddress,
  http,
  isAddress,
  keccak256,
  parseAbi,
  toBytes,
  toFunctionSelector
} from 'viem'

const ERC20_ABI = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function owner() view returns (address)',
  'function paused() view returns (bool)'
])

const LAUNCHPAD_ABI = parseAbi([
  'function stockConfigs(address) view returns (bool enabled, bool requireFreshOracleForSwaps, bool emergencyBlocked, address priceFeed, uint32 maxOracleAge, uint8 feedDecimals, bytes32 ticker, bytes32 approvedCodeHash, uint128 minInitialStockValueUsd18)',
  'function isPool(address) view returns (bool)',
  'function poolEmergencyBlocked(address) view returns (bool)',
  'function paused() view returns (bool)'
])

const RISKY_SIGNATURES = [
  ['blacklist(address)', 38, 'Blacklist control can prevent selected holders from transferring.'],
  ['setBlacklist(address,bool)', 38, 'Blacklist control can prevent selected holders from transferring.'],
  ['setBot(address,bool)', 30, 'Bot-list control can selectively block transfers.'],
  ['setBots(address[],bool)', 30, 'Bot-list control can selectively block transfers.'],
  ['setTaxFeePercent(uint256)', 28, 'Owner-adjustable transfer taxes can make exits uneconomic.'],
  ['setBuyFee(uint256)', 28, 'Owner-adjustable buy fees can alter execution after launch.'],
  ['setSellFee(uint256)', 34, 'Owner-adjustable sell fees are a common honeypot control.'],
  ['setFees(uint256,uint256)', 34, 'Owner-adjustable fees can alter execution after launch.'],
  ['setTradingEnabled(bool)', 30, 'Privileged trading switch can freeze transfers.'],
  ['enableTrading()', 20, 'Privileged trading switch is present.'],
  ['setMaxTxAmount(uint256)', 22, 'Privileged max-transaction control can block exits.'],
  ['setMaxWalletSize(uint256)', 20, 'Privileged max-wallet control can block transfers.'],
  ['mint(address,uint256)', 30, 'Privileged minting can dilute holders and pool liquidity.'],
  ['pause()', 22, 'Privileged pause functionality is present.'],
  ['unpause()', 8, 'Privileged pause functionality is present.'],
  ['upgradeTo(address)', 38, 'Upgradeable implementation can change token behavior.'],
  ['upgradeToAndCall(address,bytes)', 42, 'Upgradeable implementation can change token behavior.'],
  ['setImplementation(address)', 42, 'Privileged implementation replacement is present.'],
  ['transferOwnership(address)', 8, 'Contract has transferable ownership.'],
  ['renounceOwnership()', 4, 'Ownership management is present.']
]

const EIP1967_IMPLEMENTATION_SLOT = slotFor('eip1967.proxy.implementation')
const EIP1967_ADMIN_SLOT = slotFor('eip1967.proxy.admin')
const EIP1967_BEACON_SLOT = slotFor('eip1967.proxy.beacon')

function slotFor(label) {
  const value = BigInt(keccak256(toBytes(label))) - 1n
  return `0x${value.toString(16).padStart(64, '0')}`
}

function normalizeCode(code) {
  if (typeof code !== 'string' || !/^0x[0-9a-fA-F]*$/.test(code)) return '0x'
  return code.toLowerCase()
}

function hasNonZeroStorage(value) {
  return Boolean(value && value !== '0x' && BigInt(value) !== 0n)
}

function severityStatus(score) {
  if (score >= 90) return 'BLOCKED'
  if (score >= 65) return 'DANGER'
  if (score >= 30) return 'CAUTION'
  return 'LOW'
}

export function analyzeBytecode(bytecode, options = {}) {
  const code = normalizeCode(bytecode)
  const findings = []
  const codeHash = code === '0x' ? `0x${'0'.repeat(64)}` : keccak256(code)
  let score = 0

  if (code === '0x' || code.length <= 4) {
    return {
      status: 'BLOCKED',
      score: 100,
      codeHash,
      findings: [{ code: 'NO_RUNTIME_CODE', severity: 'critical', detail: 'Address has no deployable runtime bytecode.' }]
    }
  }

  const trustedHashes = options.trustedCodeHashes ?? new Set()
  const trustedArtifact = trustedHashes.has(codeHash.toLowerCase())
  if (trustedArtifact) {
    findings.push({ code: 'PINNED_CODE_HASH', severity: 'info', detail: 'Runtime code hash matches an operator-pinned artifact.' })
  }

  if (options.expectedCodeHash && options.expectedCodeHash.toLowerCase() !== codeHash.toLowerCase()) {
    score = 100
    findings.push({ code: 'CODE_HASH_MISMATCH', severity: 'critical', detail: 'Runtime code no longer matches the operator-approved code hash.' })
  }

  const minimalProxy = /^0x363d3d373d3d3d363d73[0-9a-f]{40}5af43d82803e903d91602b57fd5bf3$/.test(code)
    || code.includes('363d3d373d3d3d363d73') && code.includes('5af43d82803e903d91602b57fd5bf3')
  if (minimalProxy) {
    score += 72
    findings.push({ code: 'MINIMAL_PROXY', severity: 'high', detail: 'EIP-1167-style delegate proxy detected; implementation behavior is external to this address.' })
  }

  if (options.proxySlots?.implementation) {
    score += 48
    findings.push({ code: 'EIP1967_IMPLEMENTATION', severity: 'high', detail: `EIP-1967 implementation slot is populated (${options.proxySlots.implementation}).` })
  }
  if (options.proxySlots?.beacon) {
    score += 52
    findings.push({ code: 'EIP1967_BEACON', severity: 'high', detail: `Upgradeable beacon slot is populated (${options.proxySlots.beacon}).` })
  }
  if (options.proxySlots?.admin) {
    score += 18
    findings.push({ code: 'EIP1967_ADMIN', severity: 'medium', detail: `Proxy admin slot is populated (${options.proxySlots.admin}).` })
  }

  for (const [signature, weight, detail] of RISKY_SIGNATURES) {
    const selector = toFunctionSelector(signature).slice(2).toLowerCase()
    if (code.includes(selector)) {
      score += weight
      findings.push({ code: 'PRIVILEGED_SELECTOR', signature, severity: weight >= 34 ? 'high' : weight >= 20 ? 'medium' : 'low', detail })
    }
  }

  if (options.requireVerified && options.verified !== true) {
    score = Math.max(score, 100)
    findings.push({ code: 'VERIFICATION_REQUIRED', severity: 'critical', detail: 'Production execution requires explorer-verified source and bytecode metadata.' })
  } else if (options.verified === false) {
    score += 18
    findings.push({ code: 'UNVERIFIED_SOURCE', severity: 'medium', detail: 'Explorer has no fully verified source for this runtime.' })
  }
  if (options.changedBytecode) {
    score += 75
    findings.push({ code: 'EXPLORER_CHANGED_BYTECODE', severity: 'critical', detail: 'Explorer reports deployed bytecode differs from verified source.' })
  }
  if (options.decimals !== undefined && options.decimals !== 18) {
    score += 80
    findings.push({ code: 'UNSUPPORTED_DECIMALS', severity: 'critical', detail: `Protocol requires 18 decimals; token reports ${options.decimals}.` })
  }
  if (options.holderConcentration !== undefined && options.holderConcentration >= 0.9) {
    score += 22
    findings.push({ code: 'EXTREME_CONCENTRATION', severity: 'medium', detail: `Top sampled holders control ${(options.holderConcentration * 100).toFixed(1)}% of supply.` })
  } else if (options.holderConcentration !== undefined && options.holderConcentration >= 0.65) {
    score += 10
    findings.push({ code: 'HIGH_CONCENTRATION', severity: 'low', detail: `Top sampled holders control ${(options.holderConcentration * 100).toFixed(1)}% of supply.` })
  }
  if (options.registryApproved === false) {
    score = Math.max(score, 100)
    findings.push({ code: 'NOT_PROTOCOL_APPROVED', severity: 'critical', detail: 'Token is not approved by the launchpad registry and cannot be used for executable markets.' })
  }
  if (options.emergencyBlocked) {
    score = Math.max(score, 100)
    findings.push({ code: 'EMERGENCY_BLOCKED', severity: 'critical', detail: 'Operator or guardian has emergency-blocked this asset.' })
  }

  score = Math.min(100, score)
  return { status: severityStatus(score), score, codeHash, findings }
}

async function safeRead(client, request) {
  try { return await client.readContract(request) } catch { return undefined }
}

async function fetchJson(url, timeoutMs = 6_000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json' } })
    if (!response.ok) return undefined
    return await response.json()
  } catch {
    return undefined
  } finally {
    clearTimeout(timer)
  }
}

function storageAddress(value) {
  if (!hasNonZeroStorage(value)) return undefined
  const candidate = `0x${value.slice(-40)}`
  return isAddress(candidate) ? getAddress(candidate) : undefined
}

export async function scanToken({ rpcUrl, explorerUrl, chain, token, launchpadAddress, trustedCodeHashes = new Set(), requireExplorerVerification = false }) {
  if (!isAddress(token)) throw new Error('Invalid token address')
  const address = getAddress(token)
  const client = createPublicClient({ chain, transport: http(rpcUrl, { timeout: 8_000 }) })
  const bytecode = await client.getBytecode({ address }) ?? '0x'

  const [implementationRaw, adminRaw, beaconRaw, name, symbol, decimals, totalSupply, owner, tokenPaused] = await Promise.all([
    client.getStorageAt({ address, slot: EIP1967_IMPLEMENTATION_SLOT }).catch(() => undefined),
    client.getStorageAt({ address, slot: EIP1967_ADMIN_SLOT }).catch(() => undefined),
    client.getStorageAt({ address, slot: EIP1967_BEACON_SLOT }).catch(() => undefined),
    safeRead(client, { address, abi: ERC20_ABI, functionName: 'name' }),
    safeRead(client, { address, abi: ERC20_ABI, functionName: 'symbol' }),
    safeRead(client, { address, abi: ERC20_ABI, functionName: 'decimals' }),
    safeRead(client, { address, abi: ERC20_ABI, functionName: 'totalSupply' }),
    safeRead(client, { address, abi: ERC20_ABI, functionName: 'owner' }),
    safeRead(client, { address, abi: ERC20_ABI, functionName: 'paused' })
  ])

  const proxySlots = {
    implementation: storageAddress(implementationRaw),
    admin: storageAddress(adminRaw),
    beacon: storageAddress(beaconRaw)
  }

  const explorerBase = explorerUrl?.replace(/\/$/, '')
  const [addressInfo, contractInfo, counters, holders] = explorerBase ? await Promise.all([
    fetchJson(`${explorerBase}/api/v2/addresses/${address}`),
    fetchJson(`${explorerBase}/api/v2/smart-contracts/${address}`),
    fetchJson(`${explorerBase}/api/v2/tokens/${address}/counters`),
    fetchJson(`${explorerBase}/api/v2/tokens/${address}/holders`)
  ]) : [undefined, undefined, undefined, undefined]

  let holderConcentration
  if (totalSupply && holders?.items?.length) {
    const sampled = holders.items.slice(0, 10).reduce((sum, item) => sum + BigInt(item.value ?? 0), 0n)
    holderConcentration = Number(sampled * 10_000n / BigInt(totalSupply)) / 10_000
  }

  let registry
  if (launchpadAddress && isAddress(launchpadAddress)) {
    const launchpad = getAddress(launchpadAddress)
    const config = await safeRead(client, { address: launchpad, abi: LAUNCHPAD_ABI, functionName: 'stockConfigs', args: [address] })
    if (config) {
      registry = {
        enabled: config[0],
        requireFreshOracleForSwaps: config[1],
        emergencyBlocked: config[2],
        priceFeed: config[3],
        maxOracleAge: Number(config[4]),
        feedDecimals: Number(config[5]),
        ticker: config[6],
        approvedCodeHash: config[7],
        minInitialStockValueUsd18: config[8].toString()
      }
    }
  }

  const analysis = analyzeBytecode(bytecode, {
    trustedCodeHashes,
    expectedCodeHash: registry?.approvedCodeHash && registry.approvedCodeHash !== `0x${'0'.repeat(64)}` ? registry.approvedCodeHash : undefined,
    proxySlots,
    verified: contractInfo?.is_fully_verified ?? contractInfo?.is_verified ?? addressInfo?.is_verified,
    requireVerified: requireExplorerVerification,
    changedBytecode: Boolean(contractInfo?.is_changed_bytecode),
    decimals: decimals === undefined ? undefined : Number(decimals),
    holderConcentration,
    registryApproved: registry ? Boolean(registry.enabled) : undefined,
    emergencyBlocked: registry?.emergencyBlocked
  })

  if (owner && owner !== '0x0000000000000000000000000000000000000000') {
    analysis.score = Math.min(100, analysis.score + 8)
    analysis.findings.push({ code: 'OWNER_PRESENT', severity: 'low', detail: `An owner address is exposed (${owner}).` })
    analysis.status = severityStatus(analysis.score)
  }
  if (tokenPaused === true) {
    analysis.score = Math.max(analysis.score, 75)
    analysis.findings.push({ code: 'TOKEN_PAUSED', severity: 'high', detail: 'Token currently reports a paused state.' })
    analysis.status = severityStatus(analysis.score)
  }

  const hasProxyEvidence = Boolean(proxySlots.implementation || proxySlots.admin || proxySlots.beacon || analysis.findings.some((item) => item.code === 'MINIMAL_PROXY'))
  const hasDangerousSelector = analysis.findings.some((item) => item.code === 'PRIVILEGED_SELECTOR' && ['high', 'medium'].includes(item.severity))
  const mandatoryPass = Boolean(
    registry?.enabled
      && !registry.emergencyBlocked
      && analysis.codeHash.toLowerCase() === registry.approvedCodeHash.toLowerCase()
      && decimals === 18
      && bytecode !== '0x'
      && !hasProxyEvidence
      && !hasDangerousSelector
      && !contractInfo?.is_changed_bytecode
      && (!requireExplorerVerification || (contractInfo?.is_fully_verified ?? contractInfo?.is_verified ?? addressInfo?.is_verified) === true)
  )

  return {
    address,
    scannedAt: new Date().toISOString(),
    metadata: {
      name: typeof name === 'string' ? name : null,
      symbol: typeof symbol === 'string' ? symbol : null,
      decimals: decimals === undefined ? null : Number(decimals),
      totalSupply: totalSupply === undefined ? null : totalSupply.toString(),
      owner: owner ?? null,
      paused: tokenPaused ?? null
    },
    proxy: proxySlots,
    explorer: {
      verified: contractInfo?.is_fully_verified ?? contractInfo?.is_verified ?? addressInfo?.is_verified ?? null,
      changedBytecode: contractInfo?.is_changed_bytecode ?? null,
      implementation: contractInfo?.implementation_address ?? addressInfo?.implementation_address ?? proxySlots.implementation ?? null,
      holdersCount: counters?.token_holders_count ?? addressInfo?.token?.holders_count ?? null,
      transfersCount: counters?.transfers_count ?? null,
      holderConcentration: holderConcentration ?? null
    },
    registry: registry ?? null,
    strictAssetPolicy: { noProxy: !hasProxyEvidence, noDangerousSelectors: !hasDangerousSelector, exactCodeHash: Boolean(registry && analysis.codeHash.toLowerCase() === registry.approvedCodeHash.toLowerCase()), decimals18: decimals === 18 },
    ...analysis,
    tradeAllowed: mandatoryPass && analysis.status !== 'BLOCKED' && analysis.status !== 'DANGER',
    limitation: 'Static and RPC heuristics cannot prove a token is safe or exclude every honeypot. Executable markets remain restricted to factory pools and operator-approved stock contracts.'
  }
}
