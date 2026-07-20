# StockPair security policy and operating boundary

## Supported release

The actively hardened application/indexer/SDK handoff is **v0.9.0** and the unchanged Solidity protocol is **v0.6.0**. Earlier deployments are immutable and must not be represented as upgraded by publishing this source tree. Deploy v0.6 as a new stack with independently verified addresses and hashes.

## Reporting a vulnerability

Do not publish exploitable details, keys, user data or incident evidence in a public issue. Use the repository owner's private vulnerability-reporting channel and include:

- affected release/commit, chain ID and addresses;
- transaction hashes or a minimal local reproduction;
- expected and observed behavior;
- impact, prerequisites and whether exploitation is ongoing; and
- relevant frontend bundle, DNS/CDN/CI, signer, RPC and indexer evidence.

Do not move funds, probe unrelated users or exploit a live deployment to demonstrate impact.

## Security architecture

### Browser

The browser must independently verify the configured chain and factory runtime hash/version. Before any approval/write it proves the factory launch record, pool registration, pool factory/version/initialization/fee/token pair, launch-token issuer/version/metadata commitment, stock code hash, emergency posture, oracle policy and self-recipient. Every REST/SSE payload is normalized and bounded before render. Explorer links are restricted to validated HTTPS origins outside local development.

Approvals must equal the requested amount exactly, replacing a nonzero allowance with zero first. Liquidity/swap/launch workflows attempt to revoke residual allowances after completion or failure.

### Contracts

The protocol enforces, independently of the UI:

- maximum 30-minute transaction deadlines;
- maximum 3% swap minimum-output looseness;
- maximum 1% liquidity minimum-output looseness;
- maximum 5% swap input relative to input reserve;
- self-recipient execution;
- strict stock-token admission and full-runtime bytecode policy;
- fee-on-transfer/reentrancy/oracle rejection;
- creator allocation, one-year vesting and one-year initial LP custody;
- delayed administration with guardian cancellation;
- seven-day ownership-acceptance expiry; and
- maximum 30-day eligibility attestations with delayed recovery changes.

### Indexer

The indexer is read-only and has no signer. Public responses never expose the complete server-side RPC URL; production transports require TLS and dedicated provider credentials remain server-side. It uses exact origin allowlists, request limits, global/per-IP SSE limits, bounded feeds, slow-consumer removal and reviewed trusted-proxy parsing. Its data is informative; it is never sufficient authorization for a wallet write.

## Operational requirements

- Separate owner multisig, guardian and deployer responsibilities.
- Use hardware-backed signers and dedicated authenticated/archive RPC infrastructure.
- Keep public administrative UI disabled.
- Publish exact deployment addresses, code hashes and protocol versions through an authenticated release channel.
- Monitor queued actions, ownership transfers, pauses, registry changes, oracle status, code hashes, DNS/CDN/CI and frontend bundle integrity.
- Rehearse the incident runbook and approval-revocation communication before funding.

## Known boundaries

This repository cannot recover completed thefts, patch historical deployments, prove the original incident root cause or guarantee absence of unknown vulnerabilities. Independent contract, economic, frontend and infrastructure audits plus legal/compliance review remain mandatory before real-value use.

## v0.9 compatibility and reproducibility controls

The browser and both SDKs require exact indexer API version `0.9.0`. A clean release has one root lockfile, passes dependency-empty installation, proves local service readiness and contains no generated local state. See `docs/V0.9.0_REJECTION_REMEDIATION.md`.


## v0.9 direct-fallback and external-route controls

A missing hosted indexer does not cause the public browser to query its own static origin or a localhost URL. Direct RPC fallback is bounded to a 100-block bootstrap and incremental new blocks. It is a resilience path, not durable history or authorization.

External DEX trading is disabled until every relevant factory, router, wrapped-native, pair/pool and quoter runtime hash is nonzero and reviewed. Route state and quote are refreshed before signature. Quick Buy remains user-signed and is subject to confirmation, risk, maximum-buy, slippage and price-impact limits. No code in the indexer or SDK has a signer.

Outbound alerts are server-side only, use HTTPS, bounded payloads, HMAC authentication, timeouts, retry and no redirects. Provider and alert credentials are never returned through public APIs. Reputation and manipulation outputs are warnings, not fraud determinations.

Mainnet deployment tooling is simulation-first and does not accept raw key environment variables. This archive contains no mainnet deployment or funding evidence.
