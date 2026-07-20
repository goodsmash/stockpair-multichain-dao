# StockPair v0.9.0 final security and deployment verification report

## Current conclusion

The v0.9 application/indexer/SDK release passed the final quick suite, dependency-empty install, static Vercel build with no indexer URL, real local EVM/indexer/SSE/UI smoke, production dependency audit and all 13 isolated v0.6 deployed-bytecode scenarios. The Solidity source bundle remains `daade5864852d24403d5c6c90faddf19fd13add995a0a8dbf1056d2056f5a392`.

Current totals after the multi-chain/DAO extension: 160,000 AMM/liquidity cases; 39 Solidity structure files; 62 statically audited source files; 8 scanner tests; 1 live Scout deployment/activity integration test; 6 live indexer perimeter tests; 15 intelligence tests; 16 Robinhood-native tests; 7 v0.9/live-intelligence tests; 3 multi-chain/DAO tests; 4 direct-RPC/DEX tests; 13 UI/security/accessibility tests; and the retained 13/13 isolated deployed-bytecode scenarios.

The production Vercel build passed with `VITE_INDEXER_URL` blank, direct fallback enabled, a 100-block lookback and no localhost indexer target in its output. A real local run verified API header `0.9.0`, factory trust anchors, one seeded launch, Scout, Radar, alert monitor, REST, SSE and UI delivery. The unified production dependency audit reported zero known vulnerabilities.

New v0.9 controls include bounded direct RPC fallback, exact API handshakes, provider-credential redaction, runtime-hash-gated V2/V3 user-signed execution, deployer/flow warnings, HMAC-signed hosted alerts, hosted indexer templates and simulation-first mainnet tooling. No hosted provider, mainnet deployment, real external DEX route or first production market is claimed.

Machine evidence is in `qa/V0.9.0_FINAL_VERIFICATION.json`, `qa/verification-logs-v0.9.0/e2e-summary.json`, `qa/clean-install-v0.9.0.json`, `qa/demo-smoke-v0.9.0/summary.json`, `qa/production-build-v0.9.0.json` and `qa/dependency-audit-v0.9.0.json`.

Extension evidence is in `qa/multichain-dao-intelligence-v0.9.0.json`. The extension quick suite, release gate, TypeScript check and production build passed. A new isolated clean-install rerun was attempted but its `npm ci` process stalled in this execution environment and was terminated; therefore the older clean-install record is retained as baseline evidence and is not represented as a fresh extension result.

The report below preserves the detailed v0.6 protocol findings and test descriptions. Where counts or release status differ, the v0.9 section above is current.

---

## Scope and conclusion

This report covers the final v0.6.0 source tree, generated Solidity artifacts, browser application, read-only REST/SSE indexer, local launch workflow, Vercel/GitHub handoff, and release packaging controls.

The tested local release passed its executable and static verification gates. This is evidence for the specific tests listed below; it is **not** a guarantee that the system is free of unknown vulnerabilities, an independent audit, a live Robinhood Chain certification, or authorization for real-value deployment.

## Material findings closed in v0.6.0

### 1. Hostile indexer and stream data reaching browser HTML or links

All REST and SSE objects are now treated as `unknown` until runtime-normalized. Addresses, hashes, numeric strings, risk states, findings, labels, evidence records, deployer graphs and pool/swap rows are bounded and validated before rendering. External explorer links are reconstructed from reviewed origins and reject scripts, credentials, malformed values and control characters. API JSON is capped at 2 MB and individual SSE events at 256 KB.

### 2. Compromised frontend selecting unsafe transaction parameters

The Solidity protocol now enforces the safety values that were previously partly selected by the interface:

- transaction deadlines cannot exceed 30 minutes;
- swap minimum output cannot be more than 3% looser than the current contract quote;
- liquidity minimums cannot be more than 1% looser than contract previews;
- swap input remains capped at 5% of the input reserve; and
- recipients remain bound to the caller.

A malicious or modified frontend therefore cannot create effectively non-expiring swaps or near-zero minimum-output calls that bypass the browser policy.

### 3. Eligibility and ownership recovery authority

Pending ownership acceptance expires after seven days. Eligibility attestations expire within 30 days. Attestor/guardian replacement and emergency-denial clearing require an exact-action 48-hour delay, expire after seven days, and can be canceled by the guardian. Immediate revocation and emergency denial remain available for incident containment.

### 4. Approval, provenance and UI-review defects

The browser now requires exact allowance equality, uses zero-first replacement where necessary, and attempts residual revocation after use and failure paths. Before approving or writing, it proves factory registration, factory address, pool protocol version, initialization state, token pair, fee, launch record, launch-token issuer/version, metadata commitment, stock policy, oracle state and caller-bound recipient through direct RPC reads.

Transaction-review and deployer-evidence dialogs now have labelled dialog semantics, initial focus, Tab containment, Escape handling, prior-focus restoration, mobile height/scroll constraints and visible focus rings. Active navigation exposes `aria-current`.

## Deterministic property and static checks

- **100,000** deterministic swap cases preserved constant-product invariants and could not drain the output reserve.
- **10,000** monotonic quote cases passed.
- **50,000** proportional liquidity mint/burn cases did not overpay reserves.
- Total deterministic AMM/liquidity cases: **160,000**.
- **37** Solidity files passed structural checks.
- **48** source files passed static security checks.
- **8** risk-scanner bypass regressions passed.
- **3** indexer perimeter regressions passed, covering exact origins, trusted-proxy resolution, bounded SSE clients/backpressure, and the narrowly scoped disposable-local acknowledgement.
- **7** browser security, responsive-shell and accessibility contract tests passed.
- Chain Scout detected an actually deployed ERC-20-like contract on a fresh local chain.
- TypeScript validation and the hardened production Vite build passed.

## Deployed-bytecode security scenarios

Thirteen isolated fresh-chain scenarios completed with nonzero TAP pass counts and `# fail 0`:

1. launch provenance, bounded trade, creator vesting and one-year LP custody;
2. global pause preserving self-directed LP withdrawal;
3. timelocked stock delisting preserving self-directed LP withdrawal;
4. creator-allocation cap and lock-floor enforcement;
5. fee-on-transfer stock rejection with atomic rollback;
6. reentrant token callback rejection;
7. stale and invalid oracle-round rejection;
8. full-runtime bytecode-policy evasion rejection;
9. compromised-frontend deadline and slippage abuse rejection;
10. eligibility and ownership recovery-delay enforcement;
11. mandatory administration delay and guardian cancellation;
12. privileged-mint and delegate-proxy asset rejection; and
13. vesting, minimum stock value, self-recipient and maximum-swap enforcement.

Evidence and per-log SHA-256 values are recorded in `qa/verification-logs-v0.6.0/e2e-summary.json`.

Ganache emitted a warning because its optional native µWS module did not match Node 22 and then used its JavaScript fallback. This can reduce local test speed. It is not part of the production browser or deployed contract runtime. Only completed isolated TAP logs are counted.

## Full local-stack verification

The documented setup and local launch produced a disposable chain on `127.0.0.1:8545`, the read-only indexer/Scout on `127.0.0.1:8787`, and the Vite UI on `127.0.0.1:5173`.

The smoke evidence confirms:

- indexer version `0.6.0`;
- chain ID `31337` under an explicit disposable-local acknowledgement;
- exact factory runtime hash and launchpad protocol-version match;
- one seeded launch;
- active Scout coverage with deployed contracts/tokens;
- HTTP 200 for the UI; and
- an SSE response with `Content-Type: text/event-stream`, no-cache, MIME protection, frame denial, restrictive CSP and API-version headers.

Generated `.env.local`, local deployment addresses and all local processes were removed after evidence collection. See `qa/demo-smoke-v0.6.0/summary.json`.

Automated live-browser screenshots and console capture were **not executed** because the managed Chromium policy in this environment blocked localhost, private-network and `file:` navigation before the application loaded. Static responsive/accessibility contracts, production compilation and UI HTTP delivery passed, but no visual screenshot or zero-console-error claim is made.

## Final compiled artifacts

Compiler: `0.8.30+commit.73712a01.Emscripten.clang`  
Source bundle SHA-256: `daade5864852d24403d5c6c90faddf19fd13add995a0a8dbf1056d2056f5a392`  
Compiler-settings SHA-256: `b013dcf551be73a0bc1585118a70e9a6e24d60c8979660b2323ec6d4c5e18685`

| Contract | Runtime bytes | Artifact SHA-256 |
|---|---:|---|
| `StockCoinLaunchpad` | 19,333 | `f07b7c2d9933c052afdd241466793eddf7cfe749f1d80bef2b7b581c508fa14e` |
| `StockCoinPool` | 10,197 | `bc2f0182ce87d7d76223ea456d240907ac28bc8fb15b22cb4952d60244510ba2` |
| `LaunchToken` | 1,710 | `16240f0f43a2a8421b3b0a42faa8a65a8e34685f2ab2586911e2b3c9f34aa99e` |
| `LiquidityLocker` | 2,172 | `7894b134345692628a620c24efbdecfaf07035e714e05748a4ed2a8955ef6169` |
| `CreatorVestingVault` | 2,762 | `17a9ba8ff553c70f5a2a66c84078b8343b73be403c409048c96d379e83c0e816` |
| `AttestedEligibilityGate` | 4,562 | `61ac87a28827c495457fccf1dbf09294a1cb6c8dbffaccd7ffb49959b9d0943f` |

The launchpad runtime remains below the EIP-170 24,576-byte limit.

## Dependency, build and repository checks

- Root/indexer production dependency audit: **0 known vulnerabilities**.
- Browser production dependency audit: **0 known vulnerabilities**.
- Vercel production-environment validation and CSP generation passed with reviewed example HTTPS trust anchors.
- The final default bundle was rebuilt after local state removal and contains no localhost indexer or local deployment values.
- Vercel JSON, package JSON and all included GitHub workflow YAML files parsed successfully.
- Source-matched browser ABI generation and byte-for-byte artifact validation passed.
- Public administration remains disabled by default.

## External gates and residual risk

The following were not completed here:

- independent smart-contract, economic, browser, indexer or infrastructure audits;
- live Robinhood Chain testnet/staging deployment, reorg and RPC-failure testing;
- real Vercel or GitHub account deployment and organization-level controls;
- Docker image build/scanning because Docker is unavailable;
- local Foundry/Slither execution because those CLIs are unavailable, although workflows are included;
- production multisig/guardian setup, monitoring, RPC failover and incident rehearsal;
- legal, RWA/securities, sanctions, privacy and jurisdictional approval;
- forensic attribution or recovery of previously reported losses; and
- managed-device visual/browser-console validation.

The historical incident root cause remains unproven without attack transaction hashes, affected addresses, compromised bundle hashes and DNS/CDN/CI/signer/RPC evidence. v0.6.0 is a new deployment candidate; it does not modify old contracts or recover completed transfers.