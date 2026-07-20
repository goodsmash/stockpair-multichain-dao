# Changelog

## 0.9.0

- Replaced split root/browser installs with one locked npm workspace.
- Pinned Node 22.16.0 and aligned local, Vercel, GitHub and Docker installs.
- Added dependency-empty clean-checkout verification and a workspace doctor.
- Rebuilt the local supervisor to prove EVM, trust-anchor, API, SSE and UI readiness before reporting success.
- Added exact browser and SDK API-version handshakes.
- Added live hostile Host/Origin/method/query/URI perimeter tests.
- Added production HTTPS/WSS enforcement for RPC, explorer, WebSocket and Scout transports.
- Removed full server-side RPC URLs from public health/network responses and added credential-redaction regressions.
- Normalized IPv6 loopback handling and removed Ganache fallback warning noise from maintained test paths.
- Added a bounded direct-RPC browser fallback so a static Vercel site does not require a local or hosted indexer for current network state, recent deployments, token probes, factory markets, scanner evidence or portfolio reads.
- Added incremental three-second recent-block discovery with duplicate suppression and user-permissioned desktop/sound alerts.
- Added reviewed V2/V3 external DEX adapters with mandatory runtime-hash pins, fresh quotes, exact allowances, confirmation/risk/buy caps, slippage and price-impact limits, decoded review and explicit wallet signature.
- Added evidence-bounded deployer reputation and flow-manipulation warnings.
- Added signed HTTPS webhook, Discord and Telegram delivery plus incremental protocol alerts for large swaps, liquidity removal, ownership and emergency changes.
- Added Render, Fly.io and Railway templates for the unprivileged read-only indexer.
- Added simulation-first Robinhood mainnet tooling that rejects raw keys, wrong chains, shared public RPCs, duplicate roles and unacknowledged broadcast.
- Added final direct-fallback Vercel, local-stack, clean-install and 13-scenario EVM release evidence.
- Added explicit multi-chain health, lag, RPC-latency and stall evidence with per-chain confirmation/start-block policies.
- Added read-only on-demand scanning for any configured EVM chain.
- Added governor, timelock, votes, access-control and multisig-treasury fingerprints plus bounded public control probes.
- Added activity-based DAO dormant-candidate scoring with strict ownership/recovery limitations.
- Added reviewed liquidity-drop/removal events and manual buy/wait/exit opportunity queues with autonomous execution disabled.
- Added the responsive DAO Intelligence and cross-chain scanner product surfaces, OpenAPI routes, configuration templates, documentation and regressions.
- Application/indexer/SDK version advanced to 0.9.0; Solidity protocol identifiers remain v0.6.0.

## 0.8.0

- Added reviewed Robinhood mainnet/testnet network and protocol-contract registry.
- Added ERC-8056 stock-token, corporate-action, oracle, heartbeat and sequencer-safety snapshots.
- Added conservative finality, Nitro gas, canonical bridge and L1/L2 unsigned message plans.
- Added ERC-4337/EIP-7702 descriptors and bounded account/session policy schema.
- Added Nitro node, ArbOS and manual-upgrade posture.
- Added the read-only `@stockpair/robinhood-chain-kit` SDK and CLI.
- Added OpenAPI routes, JSON Schemas, examples, docs coverage matrix and agent start guide.
- Added the responsive Robinhood Native application surface.
- Application/indexer version advanced to 0.8.0; Solidity protocol identifiers remain v0.6.0.

## 0.7.0

- Added normalized Launch Radar candidate scoring and alert-rule evaluation.
- Added pluggable source descriptors for StockPair, generic deployments, Uniswap V2/V3/V4-style pools, bonding curves and LBPs.
- Added read-only Launch Radar REST endpoints and typed agent SDK.
- Added OpenAPI 3.1, JSON Schemas, example configs, integration example and prioritized agent task board.
- Added competitive launchpad research, safe execution boundaries, chain-signal catalog, reorg/finality design and low-latency feed guide.
- Added intelligence/SDK/integration-file tests and HTTPS-only remote SDK enforcement.
- Application/indexer version advanced to 0.7.0; Solidity protocol identifiers remain v0.6.0.

## 0.6.0

### Security

- Added runtime validation and size/content-type limits for every browser REST/SSE payload.
- Restricted explorer links to validated origins and rejected credential-bearing or script URLs.
- Split direct on-chain execution failure from indexer-data degradation.
- Added exact allowance equality, zero-first replacement and best-effort residual revocation.
- Added direct pool protocol/version/initialization/fee/issuer/metadata provenance checks.
- Added on-chain 30-minute deadline ceilings for launch, swap and liquidity calls.
- Added on-chain maximum 3% swap-minimum and 1% liquidity-minimum looseness.
- Added seven-day pending-ownership expiry.
- Added maximum 30-day eligibility attestations.
- Moved eligibility attestor/guardian changes and emergency-denial clearing behind 48-hour guardian-cancelable scheduling.
- Hardened proxy-chain client-IP parsing, SSE accounting/backpressure and production origin validation.

### Tests and handoff

- Added malicious browser-data runtime regressions.
- Added indexer perimeter/SSE regressions.
- Added deployed-bytecode compromised-frontend and eligibility-governance exploit proofs.
- Expanded the isolated deployed-bytecode matrix from 11 to 13 scenarios.
- Updated UI, deployment, Vercel, GitHub, indexer, security and agent handoff documentation.

## 0.5.0

- Completed responsive product UI, local setup, Vercel/static frontend handoff, containerized indexer, GitHub automation and agent/operator guides around the v0.4 protocol.

## 0.4.0

- Emergency security redesign: fail-closed browser verification, strict asset policy, delayed administration, guardian controls, vesting, LP custody, oracle/value controls and hardened deployment workflow.

## 0.3.0

- Initial complete product/Scout handoff. Retained only for historical incident analysis; do not deploy.
