export interface RadarQuery {
  chainId?: number
  limit?: number
  stage?: 'detected' | 'curve' | 'pooled' | 'graduated' | 'active'
  minScore?: number
  maxRiskScore?: number
  q?: string
}

export interface LaunchCandidate {
  id: string
  chainId: number
  tokenAddress: `0x${string}`
  stage: string
  risk: { score: number; status: string; findings: unknown[] }
  scores: { overall: number; safety: number; liquidity: number; traction: number; freshness: number; provenance: number }
  execution: { eligibleForReview: boolean; autoExecutionAllowed: false; blockers: string[]; requiredNextSteps: string[] }
}

export interface StockPairLaunchIntelligenceClientOptions {
  baseUrl: string
  fetch?: typeof fetch
  expectedApiVersion?: string
}

export declare class StockPairLaunchIntelligenceClient {
  constructor(options: StockPairLaunchIntelligenceClientOptions)
  getSources(): Promise<unknown>
  getCandidates(query?: RadarQuery): Promise<{ generatedAt: string; count: number; total: number; candidates: LaunchCandidate[] }>
  getAlerts(query?: RadarQuery): Promise<unknown>
  subscribe(onEvent: (event: unknown) => void, options?: { withCredentials?: boolean }): () => void
}
