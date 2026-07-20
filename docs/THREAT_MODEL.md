# Threat model

## Protected assets and decisions

- Stock tokens and launch coins held by factory pools.
- LP accounting, initial-lock custody, and proportional redemption rights.
- Approved-stock address and runtime-hash registry.
- Oracle, sequencer, eligibility, pause, and emergency-block decisions.
- Owner/guardian/deployer signers.
- Indexer/scanner verdict integrity.
- Frontend build, wallet-call integrity, DNS/TLS, and canonical-address provenance.

## Controls and residual risk

| Threat | Implemented control | Residual risk / required production work |
|---|---|---|
| Reentrancy from malicious token callback | Launchpad, pool, and locker guards; executable reentrancy test | Independent audit and fuzz/invariant expansion |
| Fee-on-transfer/rebasing token | Exact balance-delta checks on pulls and pushes; atomic rejection test; strict stock policy rejects delegate proxies | Nonstandard behavior and scanner false negatives still require independent review |
| Honeypot/blacklist/tax/trading switch | Factory-only execution, owner allowlist, pinned code hash, selector/proxy scanner, fail-closed verdict | Static detection has false negatives; canonical/manual review and transaction simulation remain required |
| Stock-token spoofing | Exact contract address registry, runtime hash, decimals, explorer/canonical-address runbook | Compromised owner/provenance source can still approve a bad asset |
| Proxy implementation change | On-chain strict policy rejects delegatecall/callcode and scanner rejects EIP-1967/EIP-1167 evidence | Obfuscated proxy patterns remain possible; independent bytecode/source review is mandatory |
| Reentrancy or malicious eligibility provider | Gate is called through a view/static context; launchpad/pool guards | Incorrect/offline gate can deny service; provider governance/privacy require separate review |
| Slippage, sandwich, reserve manipulation | User minimum output, deadline, browser price-impact cap, 5% reserve input cap, invariant checks | Public ordering/MEV and thin-liquidity manipulation remain economic risks |
| First-liquidity rug | 10% creator cap, 90-day cliff/one-year vesting, one-year–four-year initial LP lock, minimum oracle-denominated stock value | Creator still chooses initial price and vested tokens eventually become liquid |
| Incident traps LP funds | Pause/block stops launches/adds/swaps; LP may remove only to self during incident/delist/code mismatch | Market price and external token transferability can still deteriorate |
| Oracle failure | Positive, complete, nonfuture, max-age checks; optional sequencer feed/grace | AMM price is not oracle-pegged; correct feed policy/address must be verified |
| Arithmetic/invariant failure | Checked arithmetic, `uint112` reserves, post-swap `k`, deterministic property tests | Formal verification and external audit not completed |
| Governance compromise | Two-step owner, separate guardian, mandatory 48-hour action delay, seven-day execution window, guardian cancellation, scope-specific blocks | Compromised owner can still schedule harmful actions; monitoring and multisig review are mandatory |
| Frontend injection/clickjacking | Direct factory/pool/token/oracle verification before every write, self-recipient contract enforcement, exact approvals/revocation, restrictive CSP/header templates, frame denial | A replaced site can still propose unrelated external-contract calls; users and operators must verify domains and wallet calldata |
| API abuse/SSRF/write compromise | Read-only fixed upstreams, no relay/key, method restriction, URL/address validation, CORS, rate limit, timeouts | Production needs reverse proxy, DDoS protection, telemetry, auth for operator endpoints |
| Provider/explorer spoofing | Cross-source runbook, fail-closed scanner, code checks | Current package uses configured providers; production requires redundancy/disagreement alerts |
| Secret leakage | Deployment rejects raw `PRIVATE_KEY`; wallet-only UI; no key in indexer | Workstation, signer, shell history, CI, provider credentials still require operational controls |
| Discriminatory access policy | Eligibility is external/configurable; documentation prohibits nationality/ethnicity rules | Counsel must define objective lawful criteria, data governance, review, and appeal |

## Unsupported assets

Do not approve rebasing, transfer-taxed, callback-dependent, non-18-decimal, unreviewed proxy, owner-mintable, blacklistable, hidden-external-policy, or otherwise nonstandard stock-token contracts. Scanner warnings are not waivers.

## Immediate pause/block triggers

- Runtime/implementation/admin hash change.
- Explorer verification loss or changed-bytecode alert.
- Unexpected mint/burn/blacklist/tax/pause behavior.
- Oracle/sequencer anomaly.
- Eligibility-provider malfunction or data breach.
- Owner/guardian/DNS/frontend/provider compromise.
- Invariant/reconciliation anomaly, abnormal reserve movement, or credible legal/security notice.
