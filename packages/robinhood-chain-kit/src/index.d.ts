export interface OracleAssessmentInput {
  answer: string
  updatedAt: number | string
  heartbeatSeconds: number
  nowSeconds?: number
  sequencerUp: boolean
  sequencerStartedAt: number | string
  gracePeriodSeconds?: number
  oraclePaused?: boolean
}
export interface RobinhoodChainKitClientOptions {
  baseUrl: string
  fetch?: typeof fetch
  expectedApiVersion?: string
}
export declare function scaleRawToShares(rawAmount: string, uiMultiplier: string): string
export declare function deriveUnderlyingSharePrice(tokenPrice: string, uiMultiplier: string): string
export declare function assessOracleSnapshot(input: OracleAssessmentInput): { eligible: boolean; blockers: string[] }
export declare class RobinhoodChainKitClient {
  constructor(options: RobinhoodChainKitClientOptions)
  getCapabilities(): Promise<unknown>
  getNetwork(): Promise<unknown>
  getContracts(): Promise<unknown>
  getAccountAbstraction(): Promise<unknown>
  getGas(): Promise<unknown>
  getNodeProfile(): Promise<unknown>
  getFinality(transactionHash?: string): Promise<unknown>
  getStockTokenSnapshot(token: string, options?: { feed?: string; sequencerFeed?: string; wallet?: string; heartbeatSeconds?: number; gracePeriodSeconds?: number }): Promise<unknown>
  getMessagingPlan(options: { direction: 'l1-to-l2' | 'l2-to-l1'; target: string; data?: string; from?: string; l2CallValue?: string }): Promise<unknown>
  getBridgePlan(options: { direction: 'l1-to-l2' | 'l2-to-l1'; token?: string }): Promise<unknown>
}
