# Robinhood finality, gas and node operations

## Finality

Treat finality as stages:

1. soft sequencer confirmation — fast UX, not sufficient for high-value settlement;
2. batch posted to Ethereum — ordering becomes materially stronger;
3. Ethereum-finalized — conservative high-value status;
4. L2→L1 withdrawal challenge — separate seven-day workflow, not ordinary transaction finality.

The v0.8 endpoint uses the provider's `finalized` block tag. It intentionally does not guess whether a non-finalized transaction has been posted to L1.

## Gas

Robinhood Chain transaction cost has L2 execution and L1 data components. Estimate immediately before signing, minimize calldata, and batch only under a reviewed AA policy. The public shared RPC is not production infrastructure for latency-sensitive operation.

## Ethereum differences

- EVM `block.number` reflects an L1 estimate; use ArbSys for the L2 block number.
- `prevrandao` must not be used as randomness.
- L1 contract senders are aliased on L2.
- Nitro has documented contract/init-code limits.
- sequencing is first-come-first-served by arrival, not an Ethereum public-mempool auction.

## Node and upgrades

The pinned review records ArbOS 61 and `offchainlabs/nitro-node:v3.11.2-3599aca`. This is not an auto-update instruction. Operators must monitor official upgrade notices, verify image digests and chain-info/genesis compatibility, canary the upgrade, test rollback/snapshot restore, and verify L1 execution, beacon, sequencer feed, sync and RPC health before promotion.

Recommended documented posture: 8+ modern CPU cores, 64 GB RAM minimum (128 GB recommended), locally attached NVMe, L1 execution RPC and L1 beacon endpoint. Expose only required RPC namespaces behind authentication, TLS and rate limits.
