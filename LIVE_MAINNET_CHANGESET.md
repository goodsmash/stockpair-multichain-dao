# StockPair v0.9.0 live-mainnet intelligence changeset

Date: 2026-07-20

## Scope delivered

- Continuous confirmed contract-creation discovery from a configurable start block.
- HTTP RPC failover, durable checkpoints, append-only event journal, and bounded reorg rewind/replay.
- Three-second polling with concurrent block and receipt processing.
- Optional provider WebSocket pending contract-creation feed.
- Topic-filtered V2/V3 pool discovery, swap queries limited to indexed pools, and rotating live pool-state refreshes.
- Direct browser fallback for network state, the latest 100 blocks of contract creations, ERC-20 metadata, recent pool creation, reserves/liquidity, and price ratios.
- Evidence-enriched token scanning with runtime bytecode, source/runtime integrity, ownership/proxy controls, holder concentration, liquidity provenance, deployer history, and manipulation heuristics.
- Public-evidence wallet tracking, pending deployment queue, SSE propagation, HMAC webhook/Discord/Telegram event support, and watchlist persistence.
- Responsive pool/scanner interfaces with explicit confidence and limitation labels.
- Mainnet and hosted-indexer environment templates, OpenAPI updates, and deployment acceptance guidance.


## Multi-chain and DAO intelligence extension

- Added per-chain health, confirmation lag, expected block time, RPC latency, chain-stall and error evidence.
- Added historical call tracking for indexed contracts and a live scan endpoint for any configured EVM chain.
- Added governance fingerprints for governor, timelock, votes, access control and multisig treasuries.
- Added bounded owner/timelock/token/Safe threshold/voting/delay probes.
- Added evidence-based DAO dormancy scoring and transition alerts.
- Added liquidity-removal and configurable major-liquidity-drop alerts.
- Added manual `BUY_REVIEW`, `WAITING_FOR_EVIDENCE` and `EXIT_REVIEW` queues. Autonomous execution remains disabled.
- Added a DAO Intelligence view, chain-health dashboard and multi-chain scanner.

See `docs/MULTICHAIN_DAO_INTELLIGENCE.md`.

## Important operating boundaries

- The browser fallback is intentionally limited to 100 blocks. Complete coverage requires the hosted indexer to remain online against a dedicated archive/history-capable provider with persistent storage.
- The hot API cache is bounded. The event journal preserves the emitted event stream and should be shipped to durable storage/analytics for long-term history.
- Pending transactions are best-effort and are never treated as confirmed deployments.
- Public wallet labels must have public evidence. The software does not infer or claim private identity or common ownership.
- Scanner output is evidence and risk triage, not a security certification, audit opinion, or guarantee against honeypots, taxes, rugs, blocked sales, or liquidity removal.
- Quick Buy and sell remain non-custodial, opt-in, and wallet-signed. No key storage, hidden signing, autonomous spending, front-running, sandwiching, or anti-bot bypass was added.
- External DEX execution stays disabled until canonical chain-matched factory/router/wrapped-native/quoter addresses and exact deployed runtime hashes are independently reviewed.

## Verification completed

- `npm run test:quick` — passed.
- `npm run check:release` — passed.
- Production Vercel validation/build with chain ID 4663, blank `VITE_INDEXER_URL`, direct RPC fallback enabled, and operations disabled — passed.
- Production bundle search for `127.0.0.1:8787` and `localhost:8787` — no matches.
- 160,000 deterministic AMM/liquidity cases — passed.
- Solidity structure checks across 39 files — passed.
- Static security checks across 62 source files — passed.
- Scanner regressions — 8 passed.
- Scout deployment, next-block activity and direct-address scan integration — passed.
- Indexer perimeter/runtime tests — 6 passed.
- Launch Intelligence/SDK/schema tests — 15 passed.
- Robinhood-native tests — 16 passed.
- v0.9/live-intelligence tests — 7 passed.
- Multi-chain/DAO intelligence tests — 3 passed.
- Direct RPC/DEX tests — 4 passed.
- UI/security/responsive tests — 13 passed.
- TypeScript and Vite production build — passed.

## Verification qualification

- The complete quick suite and release gate passed after the extension.
- A fresh dependency-empty install was attempted again, but the isolated `npm ci` process stalled in this execution environment and was terminated. The existing v0.9 clean-install evidence remains historical baseline evidence; this extension does not claim a newly completed clean-install run.

## Not performed in this workspace

- No hosted Railway, Fly.io, Render, VPS, or Vercel indexer was deployed.
- No authenticated archive or WebSocket provider credentials were supplied.
- No live Robinhood mainnet transaction was signed or broadcast.
- No production launchpad addresses/runtime hashes or canonical external DEX registry values were supplied.
- No real-value market, liquidity seed, auto-trading service, email delivery service, or independent security/legal audit is claimed.

## Production activation sequence

1. Provision a dedicated authenticated archive/history HTTP provider plus failover and a JSON-RPC WebSocket provider.
2. Mount persistent storage and configure `SCOUT_STATE_FILE` and `SCOUT_EVENT_JOURNAL_FILE`.
3. Set `SCOUT_START_BLOCK` to the earliest required mainnet block and wait for zero lag in `/api/scout/summary`.
4. Configure reviewed DEX factory entries and public-evidence wallet labels.
5. Deploy the indexer over TLS, validate its v0.9 API header, then set `VITE_INDEXER_URL` in Vercel.
6. Independently verify launchpad and DEX addresses/runtime hashes before enabling any wallet execution path.
7. Keep `PRODUCTION_TRADING_ENABLED=false` and `VITE_ENABLE_OPERATIONS=false` until deployment, audit, legal, and operational gates are satisfied.
