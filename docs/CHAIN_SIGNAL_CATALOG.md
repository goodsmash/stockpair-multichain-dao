# Chain Signal Catalog

## Provenance signals

- Contract creator and funding wallet.
- Funding source age and source entity.
- Runtime code hash and cross-chain code family.
- Deployment count, token count and abandoned deployment ratio.
- Factory, router, pool and hook provenance.
- Explorer verification and compiler metadata consistency.
- Ownership, upgradeability, proxy and privileged-role state.

## Token-behavior signals

- Buy simulation and sell simulation.
- Transfer taxes and asymmetric fees.
- Blacklist, pause, max-wallet and max-transaction controls.
- Mint, burn, rebasing and supply mutation.
- Fee recipient and treasury mutability.
- Permit/approval behavior and allowance anomalies.
- ERC-20 return-value and fee-on-transfer compatibility.

## Launch-distribution signals

- Creator purchase in the deployment transaction.
- Creator, team and treasury allocation.
- Vesting and cliff duration.
- Per-wallet cap and allowlist policy.
- Unique buyers, median buy size and top-buyer share.
- Sybil clusters funded by the same source.
- Top-holder concentration excluding locked/canonical addresses.

## Liquidity signals

- Canonical pool registry proof.
- Quote asset and quote-asset trust.
- Initial real and virtual liquidity.
- LP ownership, lock duration and unlock schedule.
- Liquidity additions/removals and just-in-time liquidity.
- Price impact at standard order sizes.
- Migration/ graduation transaction and destination pool.
- v4 hook address, permissions, dynamic fee and custom accounting.

## Market-integrity signals

- Unique trader growth.
- Repeated self-trades.
- Matched buy/sell patterns.
- Circular fund flows.
- Volume concentration by wallet cluster.
- Price movement unsupported by net inflow.
- Liquidity-pool-based price inflation.
- Creator-linked wallets selling into new entrants.

## Operational signals

- RPC lag, sequencer-feed lag and indexer head.
- Reorg depth and confirmation state.
- API/SSE data disagreement with direct-chain state.
- Oracle freshness and sequencer uptime.
- Contract pause, block, delisting and governance queue state.

## Score discipline

Scores are triage aids, not safety guarantees. Every score must preserve the raw evidence and explain which signals increased or reduced it. A low score must never override a hard blocker such as unknown factory, changed runtime, failed sell simulation, unapproved hook, stale oracle or reorged launch event.
