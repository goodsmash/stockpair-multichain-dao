# StockPair App v0.7.0 release notes

## Scope

v0.7.0 is an application, indexer and agent-integration release. The Solidity protocol code and `STOCKPAIR_*_V0.6.0` protocol identifiers are unchanged.

## Added

- Normalized Launch Radar candidates with evidence-backed safety, liquidity, traction, freshness and provenance scores.
- Read-only source descriptors for StockPair, generic deployments, Uniswap V2/V3/V4-style pools, constant-product bonding curves and liquidity bootstrapping pools.
- `GET /api/radar/sources`, `GET /api/radar/candidates` and `GET /api/radar/alerts`.
- Alert-rule evaluation with bounded fields and supported actions.
- Guarded-execution policy validation that always requires user authorization and forbids key custody, front-running, sandwiching and anti-bot bypass.
- `@stockpair/launch-intelligence-sdk`, TypeScript declarations and a read-only `stockpair-radar` CLI.
- OpenAPI 3.1 specification, JSON Schemas, example configuration, unsigned execution-plan format and adapter template.
- Competitive launchpad research and implementation guides for launch-source adapters, chain signals, durable reorg-aware persistence, low-latency observation and agent workflows.
- Prioritized machine-readable agent task board.

## Explicit non-features

- No external launchpad is claimed as a live production integration.
- No webhook delivery worker is included; only matching/evaluation is implemented.
- No private keys, wallet sessions, signatures or transaction broadcast are handled by the indexer or SDK.
- No front-running, sandwiching, sequencer spam, anti-bot bypass or allowlist evasion.
- No score is a guarantee of safety or profitability.

## Recommended next implementation order

1. Durable canonical event storage with idempotency, reorg rewind and restart recovery.
2. Robinhood provider WebSocket and provisional sequencer-feed observation with canonical reconciliation.
3. Concrete Uniswap v4 PoolManager and hook adapter.
4. Concrete bonding-curve and LBP lifecycle adapters.
5. Explainable wash-trading/common-funder/circular-flow signals.
6. Signed webhook delivery with retries and a dead-letter queue.
7. Separate unsigned execution-plan/simulation service followed by explicit wallet review.
