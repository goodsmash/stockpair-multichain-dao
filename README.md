# StockPair App v0.9.0 — reproducible, runtime-hardened Robinhood Chain launchpad

StockPair is a security-focused reference application for factory-created Coin/Stock-Token pools and public on-chain intelligence on Robinhood Chain-compatible EVM networks. The repository includes the Solidity protocol, responsive Vite application, read-only REST/SSE indexer and Chain Scout, local development stack, Vercel configuration, container deployment files, GitHub automation, security regressions and complete operator/agent documentation.

> **Boundary:** StockPair is not affiliated with or endorsed by Robinhood. This release is a technical handoff candidate—not an independent audit, legal approval, recovery mechanism, production authorization or guarantee against future vulnerabilities. The application/indexer/SDK release is v0.9.0. The audited-in-repository Solidity protocol identifiers remain v0.6.0 and are intentionally unchanged. Existing v0.3/v0.4/v0.5 deployments are not upgraded in place; the v0.6 protocol requires a new verified deployment.

For the complete consolidated statement of every release claim, verification result, limitation and evidence path, read [`COMPLETE_FINAL_HANDOFF.md`](COMPLETE_FINAL_HANDOFF.md). The current release statement is [`COMPLETE_V0.9_FINAL_HANDOFF.md`](COMPLETE_V0.9_FINAL_HANDOFF.md). The v0.8 Robinhood-native history remains in [`COMPLETE_V0.8_ROBINHOOD_NATIVE_HANDOFF.md`](COMPLETE_V0.8_ROBINHOOD_NATIVE_HANDOFF.md). For the v0.7 launch-intelligence additions, read [`COMPLETE_V0.7_INTELLIGENCE_HANDOFF.md`](COMPLETE_V0.7_INTELLIGENCE_HANDOFF.md). For current agent instructions, read [`docs/AGENT_START_HERE_v0.9.md`](docs/AGENT_START_HERE_v0.9.md). For Robinhood-native capabilities, read [`docs/ROBINHOOD_NATIVE_INTEGRATION.md`](docs/ROBINHOOD_NATIVE_INTEGRATION.md) and [`docs/AGENT_START_HERE_v0.8.md`](docs/AGENT_START_HERE_v0.8.md).

## Start locally

Requirements: Node.js `22.16.0` (minimum `22.12`) and npm `10.x`. `.nvmrc` pins the tested Node line.

```bash
npm run setup
npm run local
```

Open `http://127.0.0.1:5173`. The command starts:

- a disposable local EVM on `127.0.0.1:8545`;
- the read-only indexer and Chain Scout on `127.0.0.1:8787`;
- the browser application on `127.0.0.1:5173`; and
- a seeded factory market for user-flow testing.

The supervisor prints readiness only after the EVM, exact trust anchors, API v0.9, seeded market, SSE and UI are reachable. Stop with `Ctrl+C`; generated local state and child processes are removed automatically. Never fund the deterministic local accounts. After intentionally changing Solidity, use `npm run local:fresh` so the compiler artifacts and browser ABI are rebuilt. See [`docs/LOCAL_DEVELOPMENT.md`](docs/LOCAL_DEVELOPMENT.md).

## Product surfaces

- **Discover:** factory markets, reserves, fees, lock posture and risk state.
- **Trade:** exact-input swaps, proportional liquidity addition and self-directed removal.
- **Launch:** fixed-supply launch workflow with registry, code, oracle, value, allocation and lock checks.
- **Portfolio:** launch-token, stock-token and LP balances for the connected or inspected address.
- **Chain Scout:** persistent multi-chain contract creation, ERC-20-like tokens, DEX pools/swaps, exact code families, public labels, deployer evidence and per-chain health.
- **DAO Intelligence:** governance/timelock/votes/multisig fingerprints, public activity, treasury/control probes, dormant-candidate heuristics and manual evidence-review queues.
- **Risk Scanner:** bytecode, proxy slots, privileged selectors, registry, verification and concentration evidence.
- **Activity:** launch, swap, liquidity and emergency-control events.
- **Settings:** independent trust-anchor status, indexer posture, diagnostics and browser-local privacy controls.

The UI is responsive, keyboard accessible, reduced-motion aware and explicit about degraded indexer data versus direct on-chain execution failure. It does not invent prices, candles, ownership attribution or private intelligence.


## v0.9 rejection remediation and runtime hardening

v0.9 fixes clean-checkout and deployment failures that could be hidden by a prebuilt ZIP:

- one root npm workspace and lockfile for browser, indexer and SDKs;
- exact Node/npm policy shared by local setup, Vercel, GitHub and Docker;
- dependency-empty clean-copy verification;
- proven local readiness rather than process-start assumptions;
- exact `X-StockPair-API-Version: 0.9.0` compatibility checks in browser and SDKs;
- runtime Host/Origin/query/method/URI/SSE perimeter tests;
- TLS-only production RPC, explorer, WebSocket and Scout transports; and
- redaction of server-side provider URLs so API keys in paths or queries cannot leak through public health/network responses.

See [`docs/V0.9.0_REJECTION_REMEDIATION.md`](docs/V0.9.0_REJECTION_REMEDIATION.md), [`docs/INDEXER_API_COMPATIBILITY.md`](docs/INDEXER_API_COMPATIBILITY.md) and [`docs/CLEAN_CHECKOUT_AND_RUNTIME_READINESS.md`](docs/CLEAN_CHECKOUT_AND_RUNTIME_READINESS.md).

### v0.9 deployable resilience and intelligence

- A Vercel build can operate with `VITE_INDEXER_URL` blank through bounded direct RPC reads and a 100-block recent-deployment bootstrap.
- A compatible hosted indexer remains optional acceleration for durable history, SSE, reputation, flow analysis and signed notifications.
- V2/V3 external routes are disabled unless factory/router/WETH/pair-or-pool/quoter runtime hashes are pinned.
- Quick Buy is a user-signed review path with a default 0.001 ETH amount, configurable buy cap, confirmation gate, risk gate, refreshed quote, slippage and price-impact limits.
- The hosted indexer provides HMAC-signed webhook, Discord and Telegram delivery plus protocol alerts for large swaps, liquidity removal, ownership and emergency changes.
- Deployer reputation and manipulation analysis expose bounded evidence and explicitly do not claim proof of fraud.
- Mainnet tooling defaults to simulation and refuses raw private keys, wrong chain IDs, shared public RPCs, duplicate roles or broadcast without an exact acknowledgement.

Read [`docs/DIRECT_RPC_AND_HOSTED_INDEXER.md`](docs/DIRECT_RPC_AND_HOSTED_INDEXER.md), [`docs/MULTICHAIN_DAO_INTELLIGENCE.md`](docs/MULTICHAIN_DAO_INTELLIGENCE.md), [`docs/EXTERNAL_DEX_EXECUTION.md`](docs/EXTERNAL_DEX_EXECUTION.md), [`docs/ALERT_DELIVERY.md`](docs/ALERT_DELIVERY.md) and [`docs/MAINNET_DEPLOYMENT_RUNBOOK.md`](docs/MAINNET_DEPLOYMENT_RUNBOOK.md).


### Multi-chain and DAO intelligence extension

- Any explicitly configured EVM chain can be indexed with independent start block, confirmations, expected block time, stall policy, archive HTTP failover and optional pending-transaction WebSocket.
- Scout records confirmed deployments and subsequent calls, reports unhealthy or stalled chains, and exposes on-demand live scanning by chain ID and address.
- Governance-like bytecode is classified as governor, timelock, votes, role-managed component or multisig treasury, then bounded read-only probes collect current public control parameters.
- Dormancy scores use age, indexed inactivity, call count, native treasury balance and live market evidence. They are review signals only and do not establish abandonment, ownership, recoverability or takeover rights.
- Liquidity removal and major reserve/liquidity reductions enter an exit-review queue. Token candidates with verified live pools enter a manual buy-review queue only when policy checks pass. Autonomous execution remains disabled.

Run `npm run test:multichain-dao` for the focused governance and execution-boundary regressions.

## v0.8 Robinhood-native additions

v0.8 adds a reviewed, read-only integration layer for official Robinhood Chain primitives without changing the v0.6 Solidity protocol:

- mainnet/testnet network, protocol-contract, precompile and core-token registry;
- ERC-8056 corporate-action and UI-multiplier snapshots;
- Chainlink heartbeat, sequencer uptime/recovery grace and `oraclePaused()` checks;
- staged finality and Nitro gas semantics;
- unsigned L1→L2 retryable, L2→L1 Outbox and canonical bridge plans;
- ERC-4337 v0.6/v0.7/v0.8, EIP-7702 and bounded session-policy descriptors;
- Nitro/ArbOS node and upgrade posture;
- read-only `@stockpair/robinhood-chain-kit` SDK/CLI;
- responsive Robinhood Native UI and OpenAPI/JSON Schema contracts.

The dynamic official stock-token and Chainlink feed registries are intentionally not hard-coded. Production must resolve and preserve current registry evidence. No v0.8 component accepts a private key, signs, approves or broadcasts.

## v0.7 launch-intelligence additions

v0.7 adds a read-only, pluggable Launch Radar layer without changing the v0.6 Solidity protocol:

- normalized discovery candidates and evidence-based safety/liquidity/traction/freshness/provenance scores;
- source-adapter descriptors for StockPair, generic contract creation, Uniswap V2/V3/V4-style pools, constant-product bonding curves and liquidity bootstrapping pools;
- read-only `/api/radar/sources`, `/api/radar/candidates` and `/api/radar/alerts` endpoints;
- a typed, read-only agent SDK under `packages/launch-intelligence-sdk/`;
- OpenAPI 3.1, JSON Schemas, example alert/execution/source configurations and an agent task board under `integrations/`;
- explicit guarded-execution policy validation: no private-key storage, no autonomous approval, no front-running, no sandwiching and no anti-bot bypass; and
- implementation guides for durable persistence/reorg handling, low-latency feeds, launch-source adapters, chain signals and agent integration.

v0.9 extends this layer with bounded direct-RPC discovery, reviewed V2/V3 route execution, browser-local launch notifications, deployer/manipulation warnings and signed hosted-indexer alert delivery. External DEX execution remains disabled until canonical addresses and nonzero runtime hashes are configured. Every transaction refreshes direct-chain evidence, enforces caps and requires an explicit wallet signature.

Run the new pack tests with:

```bash
npm run test:intelligence
```

See [`docs/COMPETITIVE_LAUNCHPAD_REVIEW_2026.md`](docs/COMPETITIVE_LAUNCHPAD_REVIEW_2026.md), [`docs/SAFE_LAUNCH_RADAR_AND_EXECUTION.md`](docs/SAFE_LAUNCH_RADAR_AND_EXECUTION.md) and [`docs/AGENT_INTEGRATION_COOKBOOK.md`](docs/AGENT_INTEGRATION_COOKBOOK.md).

## v0.6 security changes

The v0.6 release closes two additional exploit classes found during review:

1. **Hostile indexer/browser data:** every REST and SSE payload is runtime-normalized before rendering; addresses, hashes, amounts, risk enums, labels and explorer URLs are bounded and validated. External links are HTTPS-only outside local development. API size and content-type checks reject malformed or oversized responses.
2. **Compromised frontend transaction parameters:** contracts—not only the browser—now enforce a 30-minute maximum deadline, a 3% maximum swap-minimum looseness and a 1% maximum liquidity-minimum looseness. A compromised interface cannot submit an effectively unbounded deadline or near-zero minimum output.

Additional controls include:

- exact allowance equality with zero-first replacement and best-effort revocation;
- direct verification of factory, pool, pool version, registration, initialization, fee, token pair, issuer and metadata commitment;
- seven-day expiry on pending ownership acceptance;
- 30-day maximum eligibility attestations;
- delayed, guardian-cancelable attestor/guardian changes and emergency-denial clearing;
- separate red on-chain incident state and amber indexer-data degradation state; and
- proxy-aware indexer client-IP parsing, bounded SSE clients and slow-consumer removal.

Read [`SECURITY.md`](SECURITY.md), [`docs/V0.6.0_SECURITY_REVIEW.md`](docs/V0.6.0_SECURITY_REVIEW.md), [`docs/UI_SECURITY_MODEL.md`](docs/UI_SECURITY_MODEL.md) and [`docs/THREAT_MODEL.md`](docs/THREAT_MODEL.md).

## Verify

```bash
npm run compile
npm run verify
```

Run the 13 isolated deployed-bytecode scenarios independently:

```bash
npm run test:e2e:lifecycle
npm run test:e2e:incident-exit
npm run test:e2e:delist-exit
npm run test:e2e:creator-bounds
npm run test:e2e:fee-token
npm run test:e2e:reentrancy
npm run test:e2e:oracle
npm run test:e2e:bytecode-policy
npm run test:e2e:frontend-compromise
npm run test:e2e:eligibility
npm run test:e2e:security-timelock
npm run test:e2e:security-assets
npm run test:e2e:security-controls
```

Foundry and Slither remain mandatory in CI and before a real deployment:

```bash
forge fmt --check
forge build --sizes
forge test -vvv
slither . --filter-paths "test|script|src/mocks"
```

## Vercel and indexer deployment

Import the repository root into Vercel. `vercel.json` installs the single root workspace and builds `apps/web`, and `build:vercel` fails closed unless the production chain, factory address, runtime hash, protocol version, HTTPS origins and explicit deployment acknowledgement are present.

```bash
npm run build:web:vercel
```

Vercel hosts the static browser only. Deploy the stateful read-only REST/SSE indexer separately with `deploy/indexer/Dockerfile`. Configure exact browser origins, dedicated RPC infrastructure, trust anchors, rate/SSE limits and monitoring. See [`docs/VERCEL_DEPLOYMENT.md`](docs/VERCEL_DEPLOYMENT.md) and [`docs/INDEXER_DEPLOYMENT.md`](docs/INDEXER_DEPLOYMENT.md).

## GitHub handoff

The repository includes CI, isolated EVM matrices, Foundry, Slither, CodeQL, dependency review, Dependabot, issue/PR templates and tag-driven release packaging. Follow [`docs/GITHUB_HANDOFF.md`](docs/GITHUB_HANDOFF.md). Repository owners must configure branch protection, environments, private vulnerability reporting, CODEOWNERS/team review and signing policy in GitHub settings.

## Repository map

- `src/` — Solidity protocol.
- `apps/web/` — browser application and hostile-input UI tests.
- `services/indexer/` — read-only indexer, scanner, Chain Scout and Launch Radar.
- `packages/launch-intelligence-sdk/` — typed read-only agent SDK.
- `integrations/` — OpenAPI, JSON Schemas, examples and agent task board.
- `scripts/e2e/` — deployed-bytecode adversarial tests.
- `test/` — Foundry tests.
- `artifacts/solc/` — source-matched compiler artifacts used by deterministic local startup.
- `deploy/indexer/` — unprivileged indexer container.
- `.github/` — CI, security analysis and release automation.
- `docs/` — architecture, security, deployment, UAT and agent handoff.
- `qa/` — inherited v0.6 protocol evidence plus v0.7 intelligence-pack verification.

## Production gates

Real-value use remains blocked until independent smart-contract, economic, frontend and infrastructure audits are completed and remediated; canonical stock-token/oracle policy is legally and technically approved; hardware-backed multisig/guardian operations, durable archive indexing, monitoring, alerting, RPC failover and incident response are rehearsed; and legal/compliance authorization is explicit.
