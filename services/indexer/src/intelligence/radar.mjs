import { buildRadarSnapshot, evaluateAlertRule, validateAlertRule, validateExecutionPolicy } from './launch-intelligence.mjs'
import { createLaunchSourceRegistry } from './source-adapters.mjs'

export function createLaunchRadar({ scout, policy = {}, alertRules = [] }) {
  const sources = createLaunchSourceRegistry()
  const rules = alertRules.map(validateAlertRule)
  const executionPolicy = validateExecutionPolicy(policy)

  function snapshot(query = {}) {
    const result = buildRadarSnapshot(scout, query, executionPolicy)
    return { ...result, policy: executionPolicy }
  }

  function opportunities(query = {}) {
    const current = snapshot({ ...query, limit: 500 })
    const rawLimit = Number(query.limit ?? 100)
    const limit = Number.isSafeInteger(rawLimit) ? Math.max(1, Math.min(500, rawLimit)) : 100
    const buyReview = current.candidates
      .filter((candidate) => candidate.execution.eligibleForReview && candidate.market.verifiedPoolCount > 0)
      .map((candidate) => ({
        id: `buy:${candidate.id}`,
        kind: 'BUY_REVIEW',
        priority: candidate.scores.overall,
        candidate,
        autoExecutionAllowed: false,
        requiredAction: 'Refresh, simulate and explicitly sign in the connected wallet.'
      }))
    const waiting = current.candidates
      .filter((candidate) => !candidate.execution.eligibleForReview && candidate.scores.overall >= 40)
      .map((candidate) => ({
        id: `wait:${candidate.id}`,
        kind: 'WAITING_FOR_EVIDENCE',
        priority: candidate.scores.overall,
        candidate,
        blockers: candidate.execution.blockers
      }))
    const exitReview = scout.events({ chainId: query.chainId, limit: 500 })
      .filter((event) => ['pool-liquidity-removed', 'external-liquidity-drop', 'chain-reorg'].includes(event.kind))
      .map((event) => ({
        id: `exit:${event.id}`,
        kind: event.kind === 'chain-reorg' ? 'MARKET_DATA_REVIEW' : 'EXIT_REVIEW',
        priority: event.kind === 'pool-liquidity-removed' ? 100 : event.kind === 'external-liquidity-drop' ? 85 : 70,
        event,
        autoExecutionAllowed: false,
        requiredAction: 'Verify current balances, allowances, pool state and route simulation before any user-signed exit.'
      }))
    return {
      generatedAt: new Date().toISOString(),
      policy: executionPolicy,
      autoExecutionAllowed: false,
      userSignatureRequired: true,
      buyReview: buyReview.slice(0, limit),
      exitReview: exitReview.slice(0, limit),
      waiting: waiting.slice(0, limit),
      limitation: 'This queue prioritizes evidence for human review. It never stores a key, signs, front-runs, sandwiches, bypasses token controls or autonomously spends or sells assets.'
    }
  }

  return Object.freeze({
    sources: () => ({ generatedAt: new Date().toISOString(), sources: sources.list() }),
    snapshot,
    opportunities,
    alerts: (query = {}) => {
      const current = snapshot({ ...query, limit: 500 })
      const matches = []
      for (const candidate of current.candidates) {
        for (const rule of rules) {
          const result = evaluateAlertRule(candidate, rule)
          if (result.matched) matches.push({ candidateId: candidate.id, ruleId: rule.id, actions: rule.actions, candidate })
        }
      }
      const rawLimit = Number(query.limit ?? 100)
      const limit = Number.isSafeInteger(rawLimit) ? Math.max(1, Math.min(500, rawLimit)) : 100
      return { generatedAt: current.generatedAt, policy: executionPolicy, rules: rules.length, matches: matches.slice(0, limit) }
    }
  })
}
