# Agent start here — StockPair App v0.7.0

## Version boundary

- Application/indexer/integration pack: `0.7.0`.
- Solidity protocol identifiers: `0.6.0`, unchanged.
- Never update Solidity protocol hashes only to match the application version.

## Fifteen-minute orientation

Read in this order:

1. `AGENTS.md`
2. `SECURITY.md`
3. `docs/AGENT_HANDOFF.md`
4. `docs/SAFE_LAUNCH_RADAR_AND_EXECUTION.md`
5. `integrations/README.md`
6. `integrations/agent-tasks.json`

Run:

```bash
npm run setup
npm run test:intelligence
npm run verify
```

## Safe early-launch workflow

1. Observe contract/pool/curve events from configured canonical sources.
2. Store block hash, transaction hash, log index and provisional/final state.
3. Normalize into one candidate schema.
4. Enrich with direct-chain code, deployer, pool, reserve, hook, oracle and canonical-migration evidence.
5. Evaluate alerts; do not broadcast.
6. On user action, refresh canonical state and simulate the exact transaction.
7. Enforce source allowlist, spend cap, position cap, slippage, deadline, recipient and approval rules.
8. Present decoded review and request explicit wallet authorization.

## Highest-priority unfinished work

- Durable database, idempotent event ledger, reorg rewind and restart recovery.
- Robinhood provider WebSocket plus provisional sequencer-feed observer and canonical reconciliation.
- Concrete Uniswap v4 PoolManager adapter with hook/runtime review.
- Concrete bonding-curve and LBP lifecycle adapters with canonical graduation/settlement evidence.
- Explainable wash-trading, common-funder and circular-flow signals.
- Signed webhook delivery with retry/dead-letter handling.
- Separate guarded execution-plan service; no server-held wallet key.

## Definition of done for a source adapter

- Canonical source address and runtime hash are configured.
- Event signatures are verified against primary-source ABI/code.
- Fixtures include valid, malformed, duplicate and reorged logs.
- Normalized output is bounded and includes evidence coordinates.
- No candidate becomes executable solely from indexer data.
- Tests pass and the adapter is disabled by default until deployment review.
