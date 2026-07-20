const ADDRESS = /^0x[0-9a-fA-F]{40}$/
const HASH = /^0x[0-9a-fA-F]{64}$/
const SAFE_STAGES = new Set(['detected', 'curve', 'pooled', 'graduated', 'active'])
const SAFE_ACTIONS = new Set(['ui', 'webhook', 'email', 'discord', 'telegram'])
const SAFE_RISK_STATUSES = new Set(['LOW', 'CAUTION', 'DANGER', 'BLOCKED'])

function clamp(value, min = 0, max = 100) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : min
}

function integer(value, fallback = 0) {
  const number = Number(value)
  return Number.isSafeInteger(number) ? number : fallback
}

function text(value, max = 160) {
  if (typeof value !== 'string') return null
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, '').trim()
  return cleaned ? cleaned.slice(0, max) : null
}


function safeUrl(value, max = 300) {
  const cleaned = text(value, max)
  if (!cleaned) return null
  try {
    const parsed = new URL(cleaned)
    const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '')
    const loopback = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname.endsWith('.localhost')
    if (parsed.username || parsed.password || parsed.hash) return null
    if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && loopback)) return null
    return parsed.toString().slice(0, max)
  } catch {
    return null
  }
}

function evidenceItem(value) {
  if (typeof value === 'string') {
    const note = text(value, 240)
    return note ? { type: 'note', value: note } : null
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const type = text(value.type, 40) ?? 'evidence'
  const source = text(value.source, 80)
  const label = text(value.label ?? value.message ?? value.value, 240)
  const url = safeUrl(value.url, 300)
  const result = { type }
  if (source) result.source = source
  if (label) result.label = label
  if (url) result.url = url
  return result
}

function address(value) {
  return typeof value === 'string' && ADDRESS.test(value) ? value : null
}

function hash(value) {
  return typeof value === 'string' && HASH.test(value) ? value.toLowerCase() : null
}

function isoTimestamp(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value * 1000).toISOString()
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) return new Date(value).toISOString()
  return null
}

function ageMinutes(timestamp, now = Date.now()) {
  const parsed = timestamp ? Date.parse(timestamp) : NaN
  return Number.isFinite(parsed) ? Math.max(0, Math.floor((now - parsed) / 60_000)) : null
}

function unique(items) {
  return [...new Set(items.filter(Boolean))]
}

export function normalizeLaunchCandidate(input = {}, context = {}) {
  const tokenAddress = address(input.address ?? input.tokenAddress)
  const chainId = integer(input.chainId)
  if (!tokenAddress || chainId <= 0) throw new Error('candidate requires a valid chainId and token address')

  const pools = Array.isArray(context.pools) ? context.pools.filter((pool) => {
    if (integer(pool?.chainId) !== chainId) return false
    const token0 = String(pool?.token0 ?? '').toLowerCase()
    const token1 = String(pool?.token1 ?? '').toLowerCase()
    return token0 === tokenAddress.toLowerCase() || token1 === tokenAddress.toLowerCase()
  }) : []

  const poolAddresses = new Set(pools.map((pool) => String(pool.pool).toLowerCase()))
  const swaps = Array.isArray(context.swaps) ? context.swaps.filter((swap) => integer(swap?.chainId) === chainId && poolAddresses.has(String(swap?.pool ?? '').toLowerCase())) : []
  const deployerRecord = context.deployer ?? null
  const codeFamily = context.codeFamily ?? null
  const timestamp = isoTimestamp(input.timestamp)
  const stage = SAFE_STAGES.has(input.stage) ? input.stage : pools.length ? 'pooled' : 'detected'
  const riskScore = clamp(input.risk?.score ?? 100)
  const requestedRiskStatus = text(input.risk?.status, 20)?.toUpperCase()
  const riskStatus = SAFE_RISK_STATUSES.has(requestedRiskStatus) ? requestedRiskStatus : (riskScore >= 90 ? 'BLOCKED' : riskScore >= 65 ? 'DANGER' : riskScore >= 30 ? 'CAUTION' : 'LOW')
  const publicEvidence = Array.isArray(input.evidence) ? input.evidence.slice(0, 20).map(evidenceItem).filter(Boolean) : []
  const uniqueTraders = unique(swaps.flatMap((swap) => [address(swap.sender), address(swap.recipient)])).length
  const verifiedPools = pools.filter((pool) => pool.verifiedFactory === true).length
  const familySize = Array.isArray(codeFamily?.deployments) ? codeFamily.deployments.length : 1
  const deployerContracts = integer(deployerRecord?.contracts)
  const deployerTokens = integer(deployerRecord?.tokens)

  return {
    id: `${chainId}:${tokenAddress.toLowerCase()}`,
    chainId,
    chain: text(input.chain, 80),
    explorerUrl: safeUrl(input.explorerUrl, 300),
    tokenAddress,
    deployer: address(input.deployer),
    transactionHash: hash(input.transactionHash),
    blockNumber: /^\d{1,78}$/.test(String(input.blockNumber ?? '')) ? String(input.blockNumber) : null,
    timestamp,
    ageMinutes: ageMinutes(timestamp, context.now),
    stage,
    token: {
      name: text(input.token?.name, 96),
      symbol: text(input.token?.symbol, 32),
      decimals: Number.isInteger(input.token?.decimals) && input.token.decimals >= 0 && input.token.decimals <= 255 ? input.token.decimals : null,
      totalSupply: typeof input.token?.totalSupply === 'string' && /^\d{1,100}$/.test(input.token.totalSupply) ? input.token.totalSupply : null,
      owner: address(input.token?.owner),
      paused: typeof input.token?.paused === 'boolean' ? input.token.paused : null
    },
    codeHash: hash(input.codeHash),
    risk: {
      score: riskScore,
      status: riskStatus,
      findings: Array.isArray(input.risk?.findings) ? input.risk.findings.slice(0, 20).map(evidenceItem).filter(Boolean) : []
    },
    evidence: publicEvidence,
    market: {
      poolCount: pools.length,
      verifiedPoolCount: verifiedPools,
      standards: unique(pools.map((pool) => text(pool.standard, 40))),
      swapCount: swaps.length,
      uniqueTraders,
      latestSwapAt: swaps.map((swap) => isoTimestamp(swap.timestamp)).filter(Boolean).sort().at(-1) ?? null
    },
    provenance: {
      codeFamilySize: familySize,
      deployerContracts,
      deployerTokens,
      publicEvidenceCount: publicEvidence.length
    }
  }
}

export function scoreLaunchCandidate(candidate, policy = {}) {
  const maxRiskScore = clamp(policy.maxRiskScore ?? 29)
  const maxCodeFamilySize = Math.max(1, integer(policy.maxCodeFamilySize, 25))
  const maxDeployerTokens = Math.max(1, integer(policy.maxDeployerTokens, 20))
  const maxAgeMinutes = Math.max(1, integer(policy.maxAgeMinutes, 1_440))

  const safety = clamp(100 - candidate.risk.score)
  const liquidity = clamp(candidate.market.verifiedPoolCount * 50 + Math.min(30, candidate.market.poolCount * 15))
  const traction = clamp(Math.min(55, candidate.market.swapCount * 3) + Math.min(35, candidate.market.uniqueTraders * 5) + (candidate.market.poolCount ? 10 : 0))
  const freshness = candidate.ageMinutes === null ? 0 : clamp(100 - (candidate.ageMinutes / maxAgeMinutes) * 100)
  const provenance = clamp(
    (candidate.provenance.publicEvidenceCount ? 30 : 0)
    + (candidate.market.verifiedPoolCount ? 25 : 0)
    + (candidate.codeHash ? 10 : 0)
    + Math.max(0, 20 - Math.max(0, candidate.provenance.codeFamilySize - 1) * 2)
    + Math.max(0, 15 - Math.max(0, candidate.provenance.deployerTokens - 1))
  )
  const overall = Math.round(safety * 0.4 + liquidity * 0.2 + traction * 0.15 + freshness * 0.1 + provenance * 0.15)

  const blockers = []
  if (candidate.risk.score > maxRiskScore) blockers.push(`risk score ${candidate.risk.score} exceeds ${maxRiskScore}`)
  if (candidate.market.verifiedPoolCount < 1) blockers.push('no configured verified factory pool')
  if (candidate.provenance.codeFamilySize > maxCodeFamilySize) blockers.push('runtime code family is unusually large')
  if (candidate.provenance.deployerTokens > maxDeployerTokens) blockers.push('deployer token count exceeds policy')
  if (candidate.token.paused === true) blockers.push('token reports paused state')
  if (Array.isArray(policy.allowedChainIds) && policy.allowedChainIds.length && !policy.allowedChainIds.includes(candidate.chainId)) blockers.push('chain is not allowed by execution policy')

  return {
    ...candidate,
    scores: { overall, safety: Math.round(safety), liquidity: Math.round(liquidity), traction: Math.round(traction), freshness: Math.round(freshness), provenance: Math.round(provenance) },
    execution: {
      eligibleForReview: blockers.length === 0,
      autoExecutionAllowed: false,
      blockers,
      requiredNextSteps: ['refresh direct-chain state', 'simulate exact transaction', 'confirm recipient and spender', 'obtain explicit user signature']
    }
  }
}

export function buildRadarSnapshot(scout, query = {}, policy = {}) {
  const limit = Math.max(1, Math.min(500, integer(query.limit, 100)))
  const tokens = scout.tokens({ ...query, limit: 500 })
  const pools = scout.pools({ chainId: query.chainId, limit: 500 })
  const swaps = scout.swaps({ chainId: query.chainId, limit: 500 })
  const candidates = tokens.map((token) => {
    const deployer = token.deployer ? scout.deployer(token.chainId, token.deployer) : null
    const codeFamily = token.codeHash ? scout.codeFamily(token.codeHash) : null
    return scoreLaunchCandidate(normalizeLaunchCandidate(token, { pools, swaps, deployer, codeFamily }), policy)
  })
  const filtered = candidates.filter((candidate) => {
    if (query.stage && candidate.stage !== query.stage) return false
    if (query.maxRiskScore !== undefined && candidate.risk.score > Number(query.maxRiskScore)) return false
    if (query.minScore !== undefined && candidate.scores.overall < Number(query.minScore)) return false
    if (query.q) {
      const needle = String(query.q).toLowerCase()
      if (!JSON.stringify(candidate).toLowerCase().includes(needle)) return false
    }
    return true
  })
  filtered.sort((a, b) => b.scores.overall - a.scores.overall || (a.ageMinutes ?? Number.MAX_SAFE_INTEGER) - (b.ageMinutes ?? Number.MAX_SAFE_INTEGER))
  return {
    generatedAt: new Date().toISOString(),
    count: Math.min(limit, filtered.length),
    total: filtered.length,
    policy: { autoExecutionAllowed: false, userSignatureRequired: true },
    candidates: filtered.slice(0, limit)
  }
}

export function validateAlertRule(input = {}) {
  const id = text(input.id, 80)
  if (!id) throw new Error('alert rule requires id')
  const actions = Array.isArray(input.actions) ? unique(input.actions.filter((item) => SAFE_ACTIONS.has(item))) : ['ui']
  if (!actions.length) throw new Error('alert rule requires at least one supported action')
  return {
    id,
    enabled: input.enabled !== false,
    chainIds: Array.isArray(input.chainIds) ? unique(input.chainIds.map((item) => integer(item)).filter((item) => item > 0)) : [],
    symbols: Array.isArray(input.symbols) ? unique(input.symbols.map((item) => text(item, 32)?.toUpperCase()).filter(Boolean)) : [],
    minScore: clamp(input.minScore ?? 0),
    maxRiskScore: clamp(input.maxRiskScore ?? 100),
    minVerifiedPools: Math.max(0, integer(input.minVerifiedPools)),
    minSwaps: Math.max(0, integer(input.minSwaps)),
    maxAgeMinutes: Math.max(1, integer(input.maxAgeMinutes, 1_440)),
    requirePublicEvidence: input.requirePublicEvidence === true,
    actions
  }
}

export function evaluateAlertRule(candidate, rawRule) {
  const rule = validateAlertRule(rawRule)
  const reasons = []
  if (!rule.enabled) return { matched: false, rule, reasons: ['rule disabled'] }
  if (rule.chainIds.length && !rule.chainIds.includes(candidate.chainId)) reasons.push('chain not selected')
  if (rule.symbols.length && !rule.symbols.includes(String(candidate.token.symbol ?? '').toUpperCase())) reasons.push('symbol not selected')
  if (candidate.scores.overall < rule.minScore) reasons.push('score below minimum')
  if (candidate.risk.score > rule.maxRiskScore) reasons.push('risk above maximum')
  if (candidate.market.verifiedPoolCount < rule.minVerifiedPools) reasons.push('verified pool count below minimum')
  if (candidate.market.swapCount < rule.minSwaps) reasons.push('swap count below minimum')
  if (candidate.ageMinutes === null || candidate.ageMinutes > rule.maxAgeMinutes) reasons.push('candidate is too old or has no timestamp')
  if (rule.requirePublicEvidence && candidate.provenance.publicEvidenceCount < 1) reasons.push('public evidence required')
  return { matched: reasons.length === 0, rule, reasons }
}

export function validateExecutionPolicy(input = {}) {
  const mode = input.mode ?? 'review-only'
  if (!['review-only', 'user-signed', 'session-key'].includes(mode)) throw new Error('unsupported execution mode')
  const policy = {
    version: '1.0',
    mode,
    enabled: input.enabled === true,
    autoExecutionAllowed: false,
    userSignatureRequired: true,
    privateKeyStorageAllowed: false,
    frontRunningAllowed: false,
    sandwichingAllowed: false,
    antiBotBypassAllowed: false,
    requireSimulation: input.requireSimulation !== false,
    requireDirectChainRefresh: input.requireDirectChainRefresh !== false,
    requireVerifiedFactory: input.requireVerifiedFactory !== false,
    maxRiskScore: clamp(input.maxRiskScore ?? 20),
    maxSlippageBps: Math.max(1, Math.min(300, integer(input.maxSlippageBps, 100))),
    maxPositionBps: Math.max(1, Math.min(500, integer(input.maxPositionBps, 50))),
    maxDailySpend: typeof input.maxDailySpend === 'string' && /^\d+$/.test(input.maxDailySpend) ? input.maxDailySpend : '0',
    cooldownSeconds: Math.max(0, integer(input.cooldownSeconds, 30)),
    minLiquidity: typeof input.minLiquidity === 'string' && /^\d+$/.test(input.minLiquidity) ? input.minLiquidity : '0',
    allowedChainIds: Array.isArray(input.allowedChainIds) ? unique(input.allowedChainIds.map((item) => integer(item)).filter((item) => item > 0)) : []
  }
  if (policy.mode === 'session-key' && policy.maxDailySpend === '0') throw new Error('session-key mode requires a non-zero daily spend cap')
  return policy
}
