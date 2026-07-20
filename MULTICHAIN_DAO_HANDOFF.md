# StockPair v0.9.0 multi-chain and DAO intelligence handoff

Date: 2026-07-20

## Delivered source scope

This extension turns the existing Robinhood-focused Scout surface into a configurable EVM-chain intelligence control plane while preserving the v0.9 API and v0.6 Solidity protocol identifiers.

### Live discovery and chain health

- Per-chain confirmed-head, safe-head, confirmation lag, RPC latency, stall and error reporting.
- Continuous deployment discovery from a configured start block with persistent checkpoints, bounded reorg rewind and an append-only event journal.
- Fresh block-number reads on every poll; the Scout RPC client cache is disabled so rapid polling cannot hide a newly mined block.
- Direct address scanning on every configured EVM chain.
- Optional pending-deployment visibility through provider WebSockets; pending data never becomes confirmed evidence.
- DEX pool-creation discovery, indexed-pool swap collection and live liquidity/price refreshes.

### DAO and abandoned-contract intelligence

- Governor, timelock, votes, access-control and multisig/Safe fingerprints from runtime bytecode.
- Bounded owner, token, timelock, voting, delay, Safe owner, threshold and nonce probes.
- Post-deployment call activity, last caller, last activity block/time and observed value tracking.
- Dormancy scoring that requires age and inactivity evidence and separately considers treasury balance and live liquidity.
- Activity-resumed, liquidity-removal and major-liquidity-drop alerts.
- DAO Intelligence UI with chain health, candidate evidence, limitations and direct configured-chain scans.

### Opportunity and execution boundaries

- Manual `BUY_REVIEW`, `WAITING_FOR_EVIDENCE` and `EXIT_REVIEW` queues.
- Cross-chain execution is blocked unless the wallet is on the exact chain and a complete chain-matched adapter with nonzero reviewed runtime hashes is configured.
- No private-key storage, hidden signing, autonomous spending, mempool front-running, sandwiching, spam transactions or anti-bot bypass.
- A scanner result, risk score, liquidity observation or dormancy label is never presented as a guarantee, audit certificate, ownership finding or legal right to recover a DAO.

## Production requirements for real all-chain coverage

For each enabled EVM chain, operations must provide a dedicated authenticated archive/history HTTP endpoint, failover, persistent state and journal storage, an explicit start block, chain-specific confirmation/finality settings, and preferably a WebSocket endpoint. Dead or abandoned chains require a functioning archival node or trustworthy replica; the application cannot retrieve history from a chain whose data is no longer available.

Every DEX factory and execution adapter must be configured per chain and independently verified, including factory, router, wrapped-native token, pool/pair, quoter and exact runtime hashes. Until those values are supplied, discovery may work while trading remains disabled.

## Verification

- Complete `npm run test:quick`: passed.
- `npm run check:release`: passed.
- 160,000 deterministic AMM/liquidity cases: passed.
- 39 Solidity files: structural checks passed.
- 62 source files: static-security checks passed.
- Scanner: 8 passed.
- Live Scout deployment/activity/direct-scan integration: passed.
- Indexer perimeter/runtime: 6 passed.
- Launch Intelligence/SDK/schema: 15 passed.
- Robinhood-native: 16 passed.
- v0.9/live intelligence: 7 passed.
- Multi-chain/DAO: 3 passed.
- Direct RPC/DEX: 4 passed.
- UI/security/responsive/accessibility: 13 passed.
- TypeScript and production Vite build: passed.

A new isolated clean-install rerun was attempted, but `npm ci` stalled in this execution environment and was terminated. The package therefore retains the earlier v0.9 clean-install evidence and does not claim a fresh extension clean-install pass.

## External gates not completed

No public indexer deployment, provider account configuration, all-chain backfill, live mainnet transaction, funded production wallet, canonical cross-chain DEX registry, independent audit, legal review or abandoned-DAO recovery authorization is claimed.
