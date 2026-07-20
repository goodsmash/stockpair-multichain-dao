# StockPair App v0.9.0 agent instructions (Protocol v0.6.0)

Read this file, `docs/AGENT_HANDOFF.md`, `SECURITY.md`, `docs/UI_SECURITY_MODEL.md` and `docs/THREAT_MODEL.md` before changing executable code.


## v0.7 intelligence-pack rules

- The application/indexer/SDK version is `0.9.0`; Solidity protocol identifiers remain `STOCKPAIR_*_V0.6.0`. Never change protocol hashes merely to match the app version.
- Launch Radar and its SDK are read-only discovery surfaces. A score is not a safety guarantee, endorsement or trade authorization.
- New source adapters must emit normalized evidence, bounded identifiers and explicit finality/reorg posture. Never scrape secrets or bypass allowlists, anti-bot rules or rate limits.
- Prohibited automation: front-running, sandwiching, mempool spam, hidden-key custody, anti-bot bypass and autonomous unlimited spending.
- Any future user-signed/session-key execution must require direct-chain refresh, exact-call simulation, verified factory/provenance, explicit limits, expiry, revocation and user-visible review.
- Add adapter fixtures and `npm run test:intelligence` coverage before enabling a new source in production.

## Mission

Improve the user application, read-only indexer and contract protocol without weakening the fail-closed trust model or making unsupported production claims.

## Non-negotiable invariants

1. Never commit or log keys, mnemonics, sessions, signatures, unrestricted RPC credentials, compliance secrets or production environment files.
2. Treat REST, SSE, wallet-provider and explorer data as hostile. Runtime-validate and bound it before state or DOM use.
3. Never trust an API-supplied factory, pool, spender, token, code hash, version, fee, issuer or chain ID in a write path; prove it by direct RPC calls.
4. Preserve exact allowance equality, zero-first replacement and residual revocation. Never introduce unlimited approvals.
5. Preserve self-recipient enforcement, 30-minute on-chain deadline ceilings, 3% swap-minimum and 1% liquidity-minimum bounds.
6. Preserve factory-only markets, pool registration/version/initialization/fee/token/issuer/metadata checks and strict stock-asset bytecode policy.
7. Preserve fee-on-transfer and reentrancy rejection, oracle freshness, reserve/input limits, creator vesting and one-year LP custody.
8. Preserve seven-day ownership-acceptance expiry, 48-hour delayed recovery/configuration and guardian cancellation.
9. Keep public `VITE_ENABLE_OPERATIONS=false`. Administrative actions belong on a separate hardened origin/process.
10. Do not weaken CSP, exact CORS, production-origin validation, trusted-proxy parsing, body/SSE limits or slow-client removal.
11. Never describe the project as audited, certified, approved, mainnet-ready, unhackable or incident-recovered without independent evidence.

## Workflow

Bootstrap and fast verification:

```bash
npm run setup
npm run compile
npm run verify
```

Contract, ABI, write-path, scanner, emergency, eligibility or indexer-perimeter changes require affected isolated EVM tests plus the full 13-scenario matrix before release. UI changes require:

```bash
npm --prefix apps/web run check
npm --prefix apps/web run test:ui
npm --prefix apps/web run build
```

Inspect 390, 768, 1024 and 1440 pixel widths. Check keyboard focus, disconnected wallet, loading, empty, invalid API, oversized API, unavailable indexer, mismatched indexer, direct RPC mismatch and emergency states.

## Security ownership by file

- Browser rendering/write path: `apps/web/src/main.ts`.
- Runtime data/URL validation: `apps/web/src/lib/security.ts`.
- Browser ABI: `apps/web/src/abi/contracts.ts`.
- Visual system: `apps/web/src/style.css`.
- Production environment/CSP: `apps/web/scripts/validate-env.mjs`, `apps/web/scripts/harden-dist.mjs`, `vercel.json`.
- Indexer perimeter/config: `services/indexer/src/server.mjs`, `services/indexer/src/config.mjs`.
- Contracts: `src/`.
- Deployed-bytecode tests: `scripts/e2e/`.
- Release gates: `scripts/static-audit.mjs`, `scripts/check-release.mjs`.

## Required change sequence

1. State the threat and user impact.
2. Identify the invariant and existing test.
3. Implement the smallest coherent fix across contract/browser/indexer where required.
4. Add an executable exploit regression before declaring resolution.
5. Compile and regenerate ABI/artifacts.
6. Run quick, isolated EVM, local-stack and production-build checks.
7. Update security/release documentation and evidence.
8. Remove local state, dependencies, secrets and temporary output before packaging.

## Release claims

A passing local suite proves only the tested implementation and scenarios. It does not prove production infrastructure, third-party assets, legal status, independent audit, forensic attribution or fund recovery. Record every unavailable external gate explicitly.

## v0.9 release-engineering and API rules

- Keep one root npm workspace and one root lockfile. Nested lockfiles or second install commands are release failures.
- Require Node `22.16.0` locally/CI and never broaden below Vite's supported minimum.
- Browser and SDK clients must require exact API version `0.9.0`; SSE requires a verified REST handshake.
- Never expose `config.rpcUrl`, WebSocket credentials, provider paths or query keys through public endpoints, logs or diagnostics.
- Production RPC/explorer/WebSocket/Scout transports require TLS.
- `npm run local` may print readiness only after EVM, trust-anchor, API, SSE and HTML checks pass.
- Start with `docs/AGENT_START_HERE_v0.9.md` and `docs/V0.9.0_REJECTION_REMEDIATION.md`.

## v0.8 Robinhood-native rules

- Treat `integrations/robinhood/registry.json` as a dated reviewed artifact. Revalidate it against official docs before production.
- Never hard-code the dynamic Robinhood stock-token list or Chainlink feed list. Preserve source and review timestamps.
- All `/api/robinhood/*` features must remain read-only or unsigned-plan-only.
- Never add key custody, signing, approval, paymaster sponsorship or broadcast methods to the indexer or chain kit.
- Account-abstraction policies require target/selector allowlists, spend caps, expiry and immediate revocation.
- Treat soft sequencer confirmation, Ethereum finality and the L2→L1 challenge period as distinct states.
- Use the Arbitrum SDK for retryables/Outbox workflows and explicitly account for address aliasing.
- Node upgrades require human review, digest/version checks, a canary and rollback testing.
- Start with `docs/AGENT_START_HERE_v0.8.md` and update the coverage matrix when adding a capability.


## v0.9 integration rules

- Preserve the blank-indexer production mode. Never reintroduce localhost or same-origin `/api` fallback into the Vercel bundle.
- Direct contract-creation discovery may bootstrap at most 100 blocks and must poll only newly produced blocks afterward.
- Never enable an external DEX adapter without exact chain-matched nonzero runtime hashes for every route component.
- Quick Buy must use the normal decoded review and explicit wallet-signature path. No automatic signing, repeated spam, front-running, sandwiching or anti-bot bypass.
- Webhook secrets, bot tokens and authenticated RPC credentials are server-side secrets and must not be placed in `VITE_*`, browser storage, API responses or diagnostics.
- Reputation and flow-analysis results must expose evidence and limitations; they must not label an address as fraudulent without a reviewed source.
- Mainnet scripts remain simulation-first. Do not claim a deployment without transaction receipts, chain ID, addresses, runtime hashes and independent verification evidence.
- The Stake Engine reference was accidental and is outside this repository and release scope.
