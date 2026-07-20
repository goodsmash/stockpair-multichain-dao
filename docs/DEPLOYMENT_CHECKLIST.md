# Deployment checklist

Every checkbox is mandatory for a real-value release. A testnet pass is not mainnet approval.

## Code assurance

- [ ] Reviewed commit/tag frozen; compiler and dependency lockfiles recorded.
- [ ] `npm test` passes with five executable EVM scenarios.
- [ ] `forge fmt --check`, `forge build --sizes`, unit/fuzz/invariant tests pass at reviewed run counts.
- [ ] Slither and dependency/supply-chain findings dispositioned.
- [ ] Independent smart-contract/economic audit completed and remediated.
- [ ] Reproducible deployed bytecode and constructor inputs verified; `npm run verify:deployment` passes from a second RPC using exact code hash and protocol version.
- [ ] Frontend/API penetration test and wallet-transaction decoding review completed.

## Asset and data provenance

- [ ] Chain ID, genesis/network identity, finality policy, RPCs, and explorers independently checked.
- [ ] Stock-token address copied from current official Robinhood documentation and checked against multiple sources; strict non-proxy bytecode policy passes.
- [ ] Decimals, symbol, runtime hash, proxy type, implementation/admin/beacon, ownership, pause/mint/blacklist/tax surfaces reviewed.
- [ ] Explorer source verification required and current.
- [ ] Price and sequencer feed addresses/round semantics verified from primary sources.
- [ ] Code/implementation/feed changes continuously monitored.

## Governance and keys

- [ ] Owner is a production multisig with hardware/HSM/MPC-backed signers; the contract-enforced 48-hour delay is independently tested.
- [ ] Guardian is separate and has tested response time.
- [ ] Phase-1 scheduled calldata and action IDs are archived; Phase-2 occurs only after 48 hours; deployer has no residual control after two-step transfer.
- [ ] No raw private key, mnemonic, password, or unrestricted provider secret exists in repo, build, logs, or frontend.
- [ ] Ownership, guardian, pause, block, recovery, and signer-loss drills completed.

## Legal, compliance, and privacy

- [ ] Written legal approval for each jurisdiction, asset, user class, and operating model.
- [ ] Securities/exchange/ATS/MTF/broker-dealer, commodities, custody, payments, tax, consumer, marketing, and data obligations resolved.
- [ ] Eligibility, KYC/KYB, sanctions/AML, wallet screening, recordkeeping, disclosures, privacy, retention, appeal, and incident policy approved.
- [ ] Rules use objective legal/provider evidence and do not encode nationality, ethnicity, or stereotypes.
- [ ] Terms, risk disclosures, consent, geofencing where lawful/required, and support/escalation are deployed.

## Infrastructure and monitoring

- [ ] Dedicated redundant RPC/archive/indexer/explorer sources configured; public development RPC removed from critical path.
- [ ] Scanner requires verification and fails closed on unavailable/disagreeing sources.
- [ ] UI/API served over reviewed HTTPS with CSP, HSTS, clickjacking, MIME, referrer, permissions, COOP/CORP headers.
- [ ] DNS/registrar/CDN/build access uses MFA, least privilege, immutable artifacts, and monitored changes.
- [ ] Alerts cover governance, code/proxy, feeds, eligibility, reserves, liquidity locks/claims, unusual transfers, API lag/errors, and frontend hashes.
- [ ] Incident communications, evidence retention, pause criteria, and recovery approvals tested.

## Testnet evidence

- [ ] Deployment simulation reviewed by two people.
- [ ] Factory, locker, deployers, mocks/real integrations, constructor values, transactions, and hashes archived.
- [ ] Launch, both swap directions, add/remove, lock expiry, pause/unpause, pool/stock block/clear, delist exit, ineligible wallet, stale feed, sequencer outage, proxy/code change, RPC/explorer failure, and scanner fail-closed tested.
- [ ] Minimum oracle-denominated stock value, 5% reserve swap cap, thin-liquidity, price-impact, front-run/MEV, and market-closed oracle exercises completed.
- [ ] Canary limits, kill criteria, and rollback/pause decision record approved.

## Release decision

- [ ] Engineering owner signed.
- [ ] Independent security owner signed.
- [ ] Legal/compliance owner signed.
- [ ] Operations/SRE owner signed.
- [ ] Product/risk owner signed.
- [ ] Exact commit, deployment config, canonical sources, open risks, and release time recorded.
- [ ] `PRODUCTION_TRADING_ENABLED=true` is changed only after all approvals.
