import { StockPairLaunchIntelligenceClient } from '../../packages/launch-intelligence-sdk/src/index.js'

const client = new StockPairLaunchIntelligenceClient({ baseUrl: process.env.STOCKPAIR_INDEXER_URL ?? 'http://127.0.0.1:8787' })
const result = await client.getCandidates({ chainId: 46630, minScore: 70, maxRiskScore: 20, limit: 20 })

for (const candidate of result.candidates) {
  console.log(JSON.stringify({
    token: candidate.tokenAddress,
    score: candidate.scores.overall,
    risk: candidate.risk.score,
    reviewable: candidate.execution.eligibleForReview,
    blockers: candidate.execution.blockers
  }))
}
