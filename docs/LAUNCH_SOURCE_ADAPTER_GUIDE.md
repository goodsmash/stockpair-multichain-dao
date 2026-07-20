# Launch Source Adapter Guide

## Objective

A launch source adapter converts source-specific chain evidence into the StockPair lifecycle:

`detected -> curve/auction -> pooled -> graduated -> active`

Adapters are evidence parsers. They must not silently grant execution trust.

## Required adapter metadata

- Stable adapter ID and version.
- Supported chain IDs.
- Factory, PoolManager, vault or router addresses.
- Expected runtime hashes and protocol versions.
- Event signatures and indexed fields.
- Canonical pool-resolution method.
- Graduation or settlement condition.
- Quote-asset policy.
- Hook, tax, transfer restriction and upgradeability policy.
- Reorg confirmation requirement.
- Source links and review date.

## Built-in descriptors

The source registry in `services/indexer/src/intelligence/source-adapters.mjs` includes:

- StockPair factory launches;
- generic EVM contract creation;
- Uniswap v2-style factories;
- Uniswap v3-style factories;
- Uniswap v4 PoolManager initialization;
- constant-product bonding curves;
- liquidity bootstrapping pools.

These are descriptors, not implicit address trust. A chain-specific configuration must supply the addresses and hashes.

## Adapter output

Every normalized record should include:

- chain ID;
- source and adapter IDs;
- token and quote asset;
- creator/deployer;
- creation transaction and block hash;
- launch stage;
- curve or auction state;
- canonical pool identity;
- migration transaction;
- token, factory, pool and hook code hashes;
- creator allocation and lock data;
- risk findings and evidence references;
- canonicality status: `observed`, `confirmed`, `finalized`, `reorged`.

## Review checklist

1. Verify event signatures against primary source code.
2. Pin deployed addresses from official deployment documentation.
3. Pin runtime code hashes after deployment verification.
4. Test normal launch, cancelled launch, migration, duplicate pool, malicious hook and reorg cases.
5. Test oversized logs, malformed metadata and hostile token strings.
6. Confirm the adapter never returns `executionEligible=true`; execution is a separate policy decision.
