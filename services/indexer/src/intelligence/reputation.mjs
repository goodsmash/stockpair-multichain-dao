import { getAddress, isAddress } from 'viem'

function clamp(value, min = 0, max = 100) { return Math.max(min, Math.min(max, Math.round(value))) }
function numericAmounts(swap) {
  return Object.values(swap?.amounts ?? {}).map((value) => {
    try { return BigInt(String(value)) } catch { return 0n }
  }).filter((value) => value !== 0n)
}
function amountFingerprint(swap) {
  return numericAmounts(swap).map((value) => (value < 0n ? -value : value).toString()).sort().join(':')
}

export function createReputationEngine({ scout }) {
  function deployer(chainId, address) {
    if (!Number.isSafeInteger(Number(chainId)) || !isAddress(address)) return null
    const normalized = getAddress(address)
    const record = scout.deployer(Number(chainId), normalized)
    const deployments = record?.deployments ?? []
    const tokenDeployments = deployments.filter((item) => item.token)
    const tokenAddresses = new Set(tokenDeployments.map((item) => item.address.toLowerCase()))
    const pools = scout.pools({ chainId: Number(chainId), limit: 500 }).filter((pool) => tokenAddresses.has(pool.token0.toLowerCase()) || tokenAddresses.has(pool.token1.toLowerCase()))
    const poolAddresses = new Set(pools.map((pool) => pool.pool.toLowerCase()))
    const swaps = scout.swaps({ chainId: Number(chainId), limit: 500 }).filter((swap) => poolAddresses.has(swap.pool.toLowerCase()))
    const activeTokens = new Set()
    for (const pool of pools) {
      if (tokenAddresses.has(pool.token0.toLowerCase())) activeTokens.add(pool.token0.toLowerCase())
      if (tokenAddresses.has(pool.token1.toLowerCase())) activeTokens.add(pool.token1.toLowerCase())
    }
    const averageRisk = tokenDeployments.length ? tokenDeployments.reduce((sum, item) => sum + Number(item.risk?.score ?? 100), 0) / tokenDeployments.length : 100
    const highRisk = tokenDeployments.filter((item) => Number(item.risk?.score ?? 100) >= 65).length
    const verifiedPools = pools.filter((pool) => pool.verifiedFactory).length
    const firstTimestamp = deployments.map((item) => Number(item.timestamp ?? 0)).filter(Boolean).sort((a, b) => a - b)[0] ?? null
    const averageLifespanHours = firstTimestamp ? Math.max(0, (Date.now() / 1000 - firstTimestamp) / 3600) : null
    const activeRatio = tokenDeployments.length ? activeTokens.size / tokenDeployments.length : 0
    const score = clamp(45 + activeRatio * 25 + Math.min(15, verifiedPools * 3) + Math.min(10, swaps.length / 5) - averageRisk * 0.35 - highRisk * 7)
    return {
      chainId: Number(chainId),
      deployer: normalized,
      score,
      breakdown: {
        contractsDeployed: deployments.length,
        tokensDeployed: tokenDeployments.length,
        tokensWithObservedPools: activeTokens.size,
        verifiedFactoryPools: verifiedPools,
        observedSwaps: swaps.length,
        averageStaticRiskScore: Math.round(averageRisk),
        highRiskTokens: highRisk,
        averageObservedLifespanHours: averageLifespanHours === null ? null : Number(averageLifespanHours.toFixed(2)),
        knownRugPulls: null
      },
      blockers: tokenDeployments.length === 0 ? ['NO_TOKEN_HISTORY'] : [],
      warnings: [
        'This score uses only bounded indexed evidence and does not prove beneficial ownership.',
        'Known rug-pull status requires a reviewed external incident registry and is intentionally null when unavailable.',
        'Observed pools and swaps do not prove durable liquidity or honest trading.'
      ],
      evidence: record?.evidence ?? [],
      generatedAt: new Date().toISOString()
    }
  }

  function manipulation(chainId, pool) {
    if (!Number.isSafeInteger(Number(chainId)) || !isAddress(pool)) return null
    const normalized = getAddress(pool)
    const swaps = scout.swaps({ chainId: Number(chainId), limit: 500 }).filter((swap) => swap.pool.toLowerCase() === normalized.toLowerCase())
    const selfTrades = swaps.filter((swap) => swap.sender && swap.recipient && swap.sender.toLowerCase() === swap.recipient.toLowerCase())
    const matched = new Map()
    for (const swap of swaps) {
      const key = amountFingerprint(swap)
      if (!key) continue
      const rows = matched.get(key) ?? []
      rows.push(swap)
      matched.set(key, rows)
    }
    const matchedSizeGroups = [...matched.entries()].filter(([, rows]) => rows.length >= 3).map(([fingerprint, rows]) => ({ fingerprint, occurrences: rows.length, transactions: rows.slice(0, 10).map((item) => item.transactionHash) })).slice(0, 20)
    const edges = new Set(swaps.filter((item) => item.sender && item.recipient).map((item) => `${item.sender.toLowerCase()}:${item.recipient.toLowerCase()}`))
    const reciprocalEdges = [...edges].filter((edge) => { const [from, to] = edge.split(':'); return edges.has(`${to}:${from}`) }).length / 2
    let threeCycles = 0
    const graph = new Map()
    for (const edge of edges) { const [from, to] = edge.split(':'); const set = graph.get(from) ?? new Set(); set.add(to); graph.set(from, set) }
    for (const [a, bs] of graph) for (const b of bs) for (const c of graph.get(b) ?? []) if (c !== a && graph.get(c)?.has(a)) threeCycles += 1
    threeCycles = Math.floor(threeCycles / 3)
    const score = clamp(selfTrades.length * 18 + matchedSizeGroups.reduce((sum, item) => sum + Math.min(18, item.occurrences * 3), 0) + reciprocalEdges * 8 + threeCycles * 12)
    return {
      chainId: Number(chainId),
      pool: normalized,
      score,
      confidence: swaps.length < 5 ? 'low' : swaps.length < 25 ? 'medium' : 'high',
      observedSwaps: swaps.length,
      signals: {
        selfTrades: selfTrades.length,
        reciprocalAddressFlows: reciprocalEdges,
        threeAddressCycles: threeCycles,
        matchedSizeGroups
      },
      flagged: score >= 35,
      limitation: 'Heuristics are warnings, not proof of wash trading. Router contracts, aggregators and smart accounts can create false positives without transaction-trace attribution.',
      generatedAt: new Date().toISOString()
    }
  }

  return { deployer, manipulation }
}
