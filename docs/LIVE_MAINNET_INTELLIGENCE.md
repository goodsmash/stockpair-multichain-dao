# Live Robinhood mainnet intelligence deployment

## What this patch guarantees

The indexer scans every confirmed block from the configured `SCOUT_START_BLOCK` to the current safe head while it has continuous access to a durable, archive-capable provider. It persists the indexed head and block hash, rewinds on a detected reorganization, and writes an optional append-only event journal. DEX discovery uses topic-filtered V2/V3 pool-creation events, then queries swaps only from indexed pool addresses, verifies token pairs, and rotates direct reserve/liquidity/price refreshes across the full hot pool set.

The browser has an independent failover path for network state, the latest 100 blocks of contract creations, ERC-20 probes, recent V2/V3 pool creations, and direct pool-state reads. This is resilience, not complete historical indexing.

## Required production infrastructure

Use a dedicated authenticated HTTP provider with archive/history support, a separate JSON-RPC WebSocket provider for pending transactions, and persistent storage for `SCOUT_STATE_FILE` and `SCOUT_EVENT_JOURNAL_FILE`. Configure at least one failover HTTP endpoint through `RH_RPC_URLS`. Set `SCOUT_START_BLOCK` to the earliest block that must be covered, enable only the intended networks in `config/scout-chains.example.json`, then do not advertise complete coverage until `/api/scout/summary` reports zero lag and the state has persisted.

The public Robinhood RPC is suitable for bounded reads and emergency fallback, not a promise of unlimited historical indexing. The documented sequencer feed is not a replacement for a provider JSON-RPC WebSocket pending-transaction subscription.

## Evidence model

Signals are deliberately separated:

- confirmed deployment from a block transaction and receipt;
- pending contract creation from a provider mempool feed;
- ERC-20-like metadata probes;
- static bytecode, privileged selector and proxy-slot evidence;
- explorer source verification and holder sampling;
- DEX pool creation, verified factory status, live liquidity and price ratios;
- swap-flow manipulation heuristics;
- deployer history and exact runtime-code reuse;
- operator-configured wallet labels backed by public evidence.

No signal proves that a token is safe, that liquidity will remain, that sales will succeed, or that two addresses share a private owner. Scanner output is a warning system, not an audit opinion.

## Trading boundary

Quick Buy and sell flows remain non-custodial and user-signed. They require a reviewed chain-matched DEX adapter, exact runtime hashes, a fresh quote, minimum received, price-impact and slippage checks, a maximum-buy cap, and block confirmations. This patch does not store keys, auto-sign transactions, front-run, sandwich, bypass anti-bot controls, or autonomously spend funds.

## Deployment acceptance checks

1. Host `/health` and `/api/scout/summary` over TLS.
2. Confirm chain ID `4663`, zero indexing lag, persistent checkpoint status, and no redacted provider credential leakage.
3. Verify the API header is `X-StockPair-API-Version: 0.9.0`.
4. Exercise a reorg rewind in staging and restart the service to prove checkpoint restoration.
5. Verify pool prices against independent direct contract reads.
6. Confirm pending events are clearly marked best-effort and disappear from decision-making until confirmed.
7. Keep `PRODUCTION_TRADING_ENABLED=false` until independently reviewed contract addresses, runtime hashes, legal authorization and deployment evidence exist.
