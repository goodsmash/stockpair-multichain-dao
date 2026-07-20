# StockPair App v0.7.0 — Launch Intelligence and Agent Integration Handoff

## Release boundary

- Application, indexer and integration-pack version: `0.7.0`.
- Solidity protocol version: `0.6.0`, unchanged.
- This package inherits the v0.6 contract/security evidence. It does not claim the contracts were redesigned or independently audited again for v0.7.
- This is a technical integration candidate, not a guarantee of safety, profitability, production readiness or regulatory approval.

## What v0.7 adds

### Launch Radar

The read-only indexer now exposes:

- `GET /api/radar/sources`
- `GET /api/radar/candidates`
- `GET /api/radar/alerts`

Candidates normalize token, deployment, pool, swap, risk and provenance evidence. Scores are separated into safety, liquidity, traction, freshness and provenance. A score is a review aid, never a trade authorization.

Every candidate includes an execution-review object with blockers and required next steps. `autoExecutionAllowed` is permanently false in this release.

### Source-adapter system

Built-in descriptors cover:

- StockPair factory launches;
- generic EVM contract creation and ERC-20 probing;
- Uniswap V2-style factories;
- Uniswap V3-style factories;
- Uniswap V4-style PoolManager initialization and hook discovery;
- constant-product bonding curves and graduation; and
- liquidity bootstrapping pools and weighted auctions.

These are normalized descriptors and implementation scaffolding. Except for the existing generic/V2/V3 Scout behavior, they are not claims that every external launchpad is already live-integrated.

### Agent SDK and CLI

`packages/launch-intelligence-sdk/` contains:

- a bounded read-only JavaScript client;
- TypeScript declarations;
- HTTPS-only remote URL validation;
- response-size and JSON validation;
- candidates, sources, alerts and SSE methods; and
- the one-shot `stockpair-radar` CLI.

The SDK contains no private-key, signing, approval, transaction-building or broadcast primitive.

### Machine-readable integration contracts

`integrations/` contains:

- OpenAPI 3.1 specification;
- alert-rule, execution-policy, launch-source and unsigned-plan JSON Schemas;
- example agent and unsigned-plan files;
- a source-adapter template;
- a prioritized machine-readable task board; and
- an integration README.

### Safe early-launch tools

The supported meaning of “sniping” is rapid discovery, review, simulation and user-authorized execution. The package expressly forbids:

- front-running another user;
- sandwiching;
- sequencer or mempool spam;
- anti-bot or allowlist bypass;
- hidden private-key custody;
- autonomous unlimited spending; and
- unlimited approvals.

The execution-policy object forces:

- `autoExecutionAllowed: false`;
- `userSignatureRequired: true`;
- `privateKeyStorageAllowed: false`;
- `frontRunningAllowed: false`;
- `sandwichingAllowed: false`; and
- `antiBotBypassAllowed: false`.

It also supports bounded chain allowlists, risk, slippage, position, daily-spend, liquidity and cooldown settings.

## Competitive design review included

`docs/COMPETITIVE_LAUNCHPAD_REVIEW_2026.md` documents reusable design patterns from:

- instant constant-product bonding curves and canonical graduation;
- no-code launch configuration and same-transaction creator acquisition;
- standardized new/rising/finalized data views;
- liquidity bootstrapping pools and changing-weight auctions;
- API/SDK-first token ecosystems;
- Uniswap v4 hooks, dynamic fees and singleton PoolManager risk; and
- Robinhood Chain WebSocket, sequencer-feed, account-abstraction and canonical-asset opportunities.

The review is not an endorsement or safety ranking.

## Files an agent should read first

1. `AGENTS.md`
2. `docs/AGENT_START_HERE_v0.7.md`
3. `docs/AGENT_HANDOFF.md`
4. `docs/SAFE_LAUNCH_RADAR_AND_EXECUTION.md`
5. `docs/SAFE_EARLY_LAUNCH_TOOLKIT.md`
6. `docs/LAUNCH_SOURCE_ADAPTER_GUIDE.md`
7. `integrations/README.md`
8. `integrations/agent-tasks.json`

## Local commands

```bash
npm run setup
npm run local
```

Read-only Radar examples:

```bash
npm run test:intelligence
node packages/launch-intelligence-sdk/bin/stockpair-radar.mjs sources --base-url http://127.0.0.1:8787
node packages/launch-intelligence-sdk/bin/stockpair-radar.mjs candidates --base-url http://127.0.0.1:8787 --limit 20
```

Complete quick verification:

```bash
npm run test:quick
npm run check:release
```

## v0.7 verification completed

- 13 launch-intelligence/SDK/integration tests passed.
- OpenAPI and every included JSON example/schema parsed successfully.
- The read-only CLI was packaged successfully.
- The complete inherited quick suite passed after integration:
  - deterministic AMM/liquidity properties;
  - 37 Solidity structural checks;
  - static security checks across 51 source files;
  - 8 scanner regressions;
  - live ERC-20-like Scout detection;
  - 3 indexer perimeter/SSE tests;
  - 7 UI/security/accessibility contract tests;
  - TypeScript validation; and
  - production Vite/CSP build.
- Local full-stack smoke passed for health, source descriptors, Radar candidates, Radar alerts, CLI and UI HTTP delivery.
- The local discovered candidate remained blocked because chain `31337` was not in the configured execution allowlist.
- Source-matched v0.6 Solidity artifacts and browser ABI remained valid.
- No dependency versions changed from v0.6; a fresh npm registry audit was unavailable during this v0.7 run because the registry request stalled. The prior v0.6 audit evidence remains in the package and must not be misrepresented as a newly completed audit.

Evidence:

- `qa/V0.7.0_INTELLIGENCE_VERIFICATION.json`
- `qa/verification-logs-v0.7.0/final-quick.log`
- `qa/verification-logs-v0.7.0/release-check.log`
- `qa/verification-logs-v0.7.0/sdk-pack.json`
- `qa/demo-smoke-v0.7.0/summary.json`

## Highest-priority next work

### P0

1. Durable database, canonical block hash ledger, idempotent writes, reorg rewind and restart recovery.
2. Dedicated Robinhood provider WebSocket and provisional sequencer-feed observer with canonical reconciliation and lag metrics.
3. Concrete Uniswap v4 PoolManager adapter with configured manager runtime hash, hook scanning and dynamic-fee warnings.

### P1

4. Concrete bonding-curve lifecycle adapter: virtual reserves, progress, threshold and canonical graduation proof.
5. Concrete LBP adapter: weight schedule, current implied price, real versus virtual collateral, cap and settlement state.
6. Explainable self-trade, common-funder, matched-flow and circular-flow warnings.
7. Signed webhook delivery with HMAC, retry policy and dead-letter queue.

### P2

8. Separate unsigned execution-plan and simulation service.
9. User-owned wallet integration with exact decoded review.
10. Optional ERC-4337 session keys only with contract/function allowlists, daily/per-trade caps, expiration and immediate revocation.

## External gates

Before real-value operation, complete independent smart-contract, economic, frontend and infrastructure review; chain-specific adapter validation; production RPC/archive/WebSocket capacity testing; durable reorg tests; monitoring and incident drills; wallet/session-key review; and legal/compliance authorization.
