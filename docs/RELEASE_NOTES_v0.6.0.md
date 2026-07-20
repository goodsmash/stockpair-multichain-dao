# StockPair v0.6.0 release notes

v0.6.0 is a new protocol and application release. It is not an in-place patch for historical contracts.

## Confirmed security findings closed

### Hostile indexer and SSE content

The browser previously relied too heavily on TypeScript interfaces and incomplete escaping around indexer-fed values. v0.6 treats REST/SSE data as hostile runtime input, bounds and validates every executable/display field, rejects oversized or non-JSON responses, normalizes risk states and numeric values, and reconstructs external links from safe origins.

### Compromised-frontend transaction parameters

The previous contracts relied on the interface to choose reasonable deadlines and minimum outputs. v0.6 enforces a maximum 30-minute deadline, maximum 3% swap-minimum looseness and maximum 1% liquidity-minimum looseness on-chain. An altered frontend cannot submit effectively non-expiring transactions or near-zero minimums.

### Eligibility and ownership recovery

Pending ownership acceptance expires after seven days. Eligibility attestations cannot exceed 30 days. Attestor/guardian replacement and emergency-denial clearing are delayed for 48 hours, expire after seven days and can be canceled by the guardian.

### Approval and pool provenance

Approvals must exactly equal the required amount, are zeroed before replacement, and are revoked after use where possible. Every pool must independently prove factory registration, protocol version, initialization, pair, fee, issuer, launch-token version and metadata commitment before a wallet action.

## User-interface improvements

- Separate red direct-chain execution locks from amber indexer-data degradation.
- Labelled and keyboard-contained transaction/deployer dialogs.
- Escape-to-close, prior-focus restoration and visible focus indicators.
- `aria-current` for active navigation.
- Mobile-safe modal scrolling and sticky review actions.
- Clearer transaction-policy and deployment-posture explanations.
- Strong invalid-data, unavailable-indexer, loading and blocked states.

## Verification summary

- 160,000 deterministic AMM/liquidity properties.
- 13 independently completed deployed-bytecode scenarios.
- 8 scanner regressions, 3 indexer perimeter tests and 7 browser/UI tests.
- Live local ERC-20-like Scout detection.
- Source/artifact/ABI validation, TypeScript and hardened Vite/CSP builds.
- Full disposable local stack with verified factory hash/version and SSE.
- Zero known production dependency vulnerabilities in both runtime graphs.

See `RELEASE_VERIFICATION.json`, `docs/SECURITY_TEST_REPORT.md`, `docs/V0.6.0_SECURITY_REVIEW.md` and `qa/verification-logs-v0.6.0/`.
