# User acceptance tests

Run against the exact Vercel Preview in direct-only mode and, when used, repeat against the separately hosted indexer before Production promotion.

## Environment/trust

- [ ] Chain, factory address, runtime hash and v0.6 protocol version match independent deployment evidence.
- [ ] Pool version/registration/initialization/fee/pair/issuer/metadata checks pass for a known market.
- [ ] Deliberately wrong factory hash/version locks every write with a red incident state.
- [ ] Blank, unavailable or mismatched indexer produces direct-RPC/degraded-data state and cannot authorize a write.
- [ ] The production bundle contains no `127.0.0.1:8787` target and does not call Vercel-origin `/api` routes.
- [ ] Initial direct contract discovery scans no more than 100 blocks and later polls only new blocks.
- [ ] Public operations are absent.

## Hostile-data behavior

- [ ] Malformed JSON and non-JSON API responses show safe errors.
- [ ] Responses over 2 MB and SSE events over 256 KB are rejected.
- [ ] Invalid addresses/hashes/amounts/risk labels are discarded or normalized.
- [ ] `javascript:`, credential-bearing and control-character explorer URLs never become clickable.
- [ ] HTML-like labels/findings render as text, not markup.

## Navigation/responsive/accessibility

- [ ] All eight views open by hash URL.
- [ ] No horizontal overflow at 390, 768, 1024 and 1440 px.
- [ ] Mobile navigation respects safe-area inset.
- [ ] Keyboard focus is visible; `/` focuses search; dialogs are understandable.
- [ ] Reduced-motion preference suppresses continuous motion.
- [ ] Loading, empty, disconnected, blocked, API-error and stale-indexer states remain readable.

## External DEX and Quick Buy

- [ ] No external route is enabled with a missing/zero/mismatched runtime hash.
- [ ] Factory/router/WETH/pair-or-pool/quoter code and token pair are rechecked before signature.
- [ ] Quote, minimum received, price impact, slippage, buy cap, risk and confirmations are visible.
- [ ] Quick Buy opens decoded review and a wallet request; it never signs automatically.
- [ ] Token sale allowance is exact, zero-first where required and revocation is attempted afterward.

## Wallet and transaction policy

- [ ] Wrong chain invokes switch/add flow and does not sign on the wrong network.
- [ ] Review shows target/function/sender/decoded args/policy.
- [ ] Existing allowance is zeroed and final allowance exactly equals required amount.
- [ ] Residual allowance revocation is attempted after success/failure.
- [ ] A 31-minute deadline reverts on-chain.
- [ ] Swap minimum looser than 3% and liquidity minimum looser than 1% revert on-chain.
- [ ] Input over 5% reserve, high browser price impact and non-self recipient are blocked/revert.
- [ ] Malicious indexer pool/spender substitution fails direct provenance verification.

## Launch/governance/emergency

- [ ] Unapproved, proxy, privileged, fee-on-transfer or wrong-code stock fails.
- [ ] Stale/invalid oracle fails.
- [ ] Creator allocation, vesting, seed value, fee and one-year LP custody checks apply.
- [ ] Eligibility over 30 days fails.
- [ ] Attestor/guardian/recovery changes cannot execute before 48 hours and can be guardian-canceled.
- [ ] Pending ownership cannot be accepted after seven days.
- [ ] Pause/delisting blocks new risk while preserving self-directed LP exit where specified.

## Production response headers

- [ ] CSP, frame denial, MIME, referrer, permissions, COOP/CORP and HSTS are present.
- [ ] Built frontend contains no localhost targets or embedded credentials.
- [ ] Static asset cache headers are immutable; HTML is not incorrectly immutable.


## Alerts and hosted service

- [ ] Exact API v0.9 handshake is required before SSE.
- [ ] Hostile Host/Origin/method/query/URI requests are rejected.
- [ ] Public health/network output contains no RPC path, query or provider credential.
- [ ] Signed webhook receiver verifies HMAC, timestamp and event idempotency.
- [ ] Large-swap, liquidity-removal, ownership and emergency alerts include preserved chain evidence.
- [ ] Browser watchlist and notification preferences remain local; no email delivery is claimed.
