# StockPair v0.9.0 complete final handoff

## Release identity

- Application, browser, indexer and SDK release: `0.9.0`
- Solidity protocol identifiers: `0.6.0` (unchanged)
- Required indexer header: `X-StockPair-API-Version: 0.9.0`
- Tested Node: `22.16.0`
- Tested npm: `10.9.2`
- Solidity source-bundle SHA-256: `daade5864852d24403d5c6c90faddf19fd13add995a0a8dbf1056d2056f5a392`

This is a hardened technical release candidate, not an independent audit, authorization for real-value deployment, recovery guarantee or claim that the system is unhackable.

## What changed after the rejection

### Clean checkout and runtime readiness

- One root workspace lockfile owns the browser, indexer and both SDKs.
- Vercel, GitHub, Docker and local setup use the same dependency graph.
- Node/npm versions are pinned to the tested Vite-compatible line.
- `npm run verify:clean-install` proves installation and build from an empty dependency state.
- `npm run local` reports readiness only after EVM, factory trust anchors, API v0.9, seeded launch, SSE and UI HTTP are working.
- Disposable local processes, deployment state and `.env.local` are removed on shutdown.

### Vercel works without a local indexer

The production browser accepts a blank `VITE_INDEXER_URL`. It does not contact `127.0.0.1:8787`, does not issue `/api` calls to the static Vercel origin and does not open a broken same-origin EventSource.

Bounded direct RPC fallback supplies:

- chain ID, block height and gas price;
- configured StockPair factory launches and markets;
- current connected-wallet balances;
- a maximum 100-block initial contract-creation scan;
- incremental scans of only newly produced blocks;
- ERC-20-like metadata probes;
- direct bytecode/proxy scanner evidence; and
- Radar candidates derived from current bounded evidence.

A hosted indexer remains recommended for durable history, reorg reconciliation, SSE, signed alerts and long-window reputation/flow evidence. Render, Fly.io and Railway templates are included, but no provider account was deployed in this release.

### External DEX buy and sell path

V2/V3 external execution exists but is disabled until a reviewed adapter is configured. Every adapter requires exact chain-matched nonzero runtime hashes for factory, router, wrapped native token, pair/pool and V3 quoter.

Before wallet signature, the browser verifies route code and token pair, refreshes the quote, calculates minimum received and price impact, enforces confirmations, risk, maximum-buy and slippage policy, displays decoded calldata, and requires explicit wallet confirmation. Token sales use exact allowance with zero-first replacement and residual revocation attempts.

Quick Buy defaults to `0.001 ETH`, is configurable within a separate maximum-buy cap and is never autonomous. It does not store keys, front-run, sandwich, bypass anti-bot rules or spam transactions.

### Scanner, reputation and manipulation evidence

The release includes:

- runtime bytecode and proxy-slot probes;
- privileged selector and policy warnings;
- optional Blockscout source-verification and holder evidence;
- deployer contract count, active-liquidity and lifespan evidence;
- self, reciprocal, circular and matched-size flow warnings; and
- explicit limitations and confidence labels.

These outputs are warnings. They do not prove a honeypot, fraud, wash trading or rug pull. `knownRugPulls` stays unknown without a reviewed evidence source.

### Alerts and notifications

Browser-local watchlists, theme, Quick Buy preferences and desktop/sound launch notifications are stored locally. The hosted indexer can deliver bounded HMAC-signed HTTPS webhooks plus Discord or Telegram notifications. Protocol alerts include large reserve-relative swaps, liquidity removal, ownership changes and emergency changes.

There is no user email service in this release and no webhook secret is stored in the browser.

### Mainnet deployment tooling

Simulation-first Robinhood mainnet scripts and a two-phase Foundry workflow are included. The tooling rejects wrong chain IDs, raw private-key environment variables, shared public RPCs, duplicate roles, insufficient balance and broadcast without the exact acknowledgement.

No mainnet transaction, funded production wallet, production contract address, external DEX adapter or first real market is claimed.

## Security controls retained

- Browser writes independently verify chain, factory address/hash/version, launch record, pool registration/version/state/pair/fee, launch-token issuer/version/metadata, stock-token code hash, oracle state, emergency state and self-recipient.
- Contract-level maximum 30-minute deadlines.
- Contract-level maximum 3% swap minimum-output looseness.
- Contract-level maximum 1% liquidity minimum-output looseness.
- Maximum 5% swap input relative to input reserve.
- Exact approvals and residual revocation attempts.
- Strict full-runtime stock-token policy.
- Fee-on-transfer, reentrancy and stale/invalid oracle rejection.
- Creator allocation, vesting and initial LP custody bounds.
- Delayed guardian-cancelable administration and expiring ownership acceptance.
- Bounded Host, Origin, method, URI, query and SSE perimeter.
- Exact v0.9 REST handshake before accepting indexer data or SSE.
- Server provider URLs and credentials redacted from public APIs.
- TLS-only production transports.

## Verification completed

- 160,000 deterministic AMM/liquidity property cases passed.
- 39 Solidity files passed structural checks.
- 61 source files passed static-security checks.
- 8 scanner regressions passed.
- Live ERC-20-like Scout detection passed.
- 6 live indexer perimeter/runtime tests passed.
- 15 Launch Intelligence/SDK/schema tests passed.
- 16 Robinhood-native tests passed.
- 4 reputation/alert tests passed.
- 3 executable direct-RPC/DEX tests passed.
- 12 UI, hostile-data, responsive and accessibility tests passed.
- TypeScript, Vite and production CSP build passed.
- All 13 isolated deployed-bytecode scenarios passed with completed TAP logs and per-log SHA-256 hashes.
- Dependency-empty clean installation passed.
- Real local EVM/indexer/Radar/SSE/UI smoke passed.
- Production Vercel build passed with `VITE_INDEXER_URL` blank and no localhost indexer string in the bundle.
- Root production dependency audit reported zero known vulnerabilities.
- Hosted deployment JSON/TOML/YAML and integration OpenAPI/JSON parsed successfully.

Primary machine evidence:

- `qa/V0.9.0_FINAL_VERIFICATION.json`
- `qa/clean-install-v0.9.0.json`
- `qa/demo-smoke-v0.9.0/summary.json`
- `qa/production-build-v0.9.0.json`
- `qa/dependency-audit-v0.9.0.json`
- `qa/verification-logs-v0.9.0/e2e-summary.json`

## Commands

```bash
nvm use
npm ci --ignore-scripts --no-audit --no-fund
npm run doctor
npm run validate:artifacts
npm run test:quick
npm run local
npm run verify:clean-install
npm run check:release
```

## Deployment sequence

1. Push the clean repository to GitHub.
2. Enable branch protection, required CI/CodeQL/dependency review and signed tags.
3. Deploy the static frontend to Vercel with reviewed public values; `VITE_INDEXER_URL` may remain blank.
4. Deploy the read-only indexer separately through the included container template when durable history/alerts are required.
5. Verify exact API header and trust anchors before setting the indexer URL in Vercel.
6. Keep operations disabled until an independently reviewed target-chain deployment exists.
7. Configure external DEX adapters only after canonical addresses and runtime hashes are independently verified.
8. Perform mainnet simulation and independent approval before any broadcast.

## External gates

- independent smart-contract, economic, frontend and infrastructure audits;
- legal/compliance authorization;
- real Robinhood testnet/mainnet deployment and transaction evidence;
- current official stock-token/feed registry review;
- hosted-indexer monitoring, backup, persistent/reorg-aware storage and incident drills;
- physical-device/browser acceptance testing; and
- canonical external DEX registry and runtime-hash review.

The Stake Engine reference was accidental and is not part of this repository, release, verification or compliance scope.
