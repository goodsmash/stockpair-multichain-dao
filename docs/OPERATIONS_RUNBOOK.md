# Operations runbook

## Roles

- **Owner:** production multisig/timelock; configures assets, compliance/oracles, guardian, unpause, and clears blocks.
- **Guardian:** separate low-latency emergency role; may pause or block stock/pool but cannot restore service.
- **Deployer:** temporary hardware/HSM/MPC-backed signer; relinquishes control through two-step ownership.
- **Compliance provider:** objective eligibility decision service approved by counsel and privacy/security owners.
- **Security operator:** monitors code hashes, proxies, feeds, reserves, events, frontend integrity, and provider health.

No role should be selected or denied based on nationality or ethnicity. Jurisdiction and sanctions controls must be based on applicable law and approved provider evidence, with review/appeal procedures where required.

## Pre-deployment

1. If responding to an active loss event, follow `INCIDENT_RESPONSE.md` first. Freeze the reviewed commit and compiler versions.
2. Run `npm test`, Foundry, Slither, dependency review, and independent audit.
3. Verify chain ID and RPC independently.
4. Copy canonical stock/feed addresses from current official documentation and compare code, proxy, implementation/admin, decimals, symbol, and explorer verification.
5. Record approved runtime and implementation hashes.
6. Verify owner/guardian/gate/feed addresses out of band.
7. Simulate the Phase-1 schedule, archive exact calldata/action IDs, and simulate Phase-2 execution after 48 hours.
8. Verify code hash, protocol version, child factory links, owner, and guardian with `npm run verify:deployment` through a second RPC.
9. Require two-person review of every constructor/configuration value.

## Launch enablement

Keep `PRODUCTION_TRADING_ENABLED=false` until:

- contract audit and remediation are complete;
- legal/compliance release is signed;
- owner and guardian drills pass;
- dedicated redundant RPC/indexer/alerting are live;
- explorer verification is mandatory;
- frontend build, DNS, TLS, CSP, and wallet-call decoding are reviewed; and
- a canary launch limit and rollback decision are approved.

## Monitoring

Alert on:

- owner/pending-owner/guardian/compliance/sequencer/stock configuration changes;
- runtime or proxy implementation/admin hash changes;
- pause and per-stock/per-pool blocks;
- stale, incomplete, non-positive, or divergent feeds;
- sudden reserve/price/volume changes, liquidity concentration, or large LP claims;
- scanner verdict changes or explorer verification loss;
- RPC/explorer disagreement, reorgs, indexing lag, and API error rate;
- DNS, certificate, CSP, dependency, or frontend bundle hash changes.

## Incident sequence

1. Confirm chain and provider observations through an independent source.
2. Take the write-enabled frontend offline. Guardian pauses globally or blocks the smallest affected scope.
3. Preserve logs, transaction hashes, bytecode, provider responses, and timestamps.
4. Announce that additions/swaps are blocked; explain that self-directed LP exits remain available.
5. Revoke compromised infrastructure credentials and rotate off-chain secrets.
6. Determine whether stock code, proxy implementation, feed, gate, owner, frontend, or RPC changed.
7. Do not unpause merely because symptoms disappear.
8. Owner schedules restoration; guardian/security reviews the queued calldata during the 48-hour delay. Execute only after root cause, remediation, replayed exploit tests, legal review where applicable, and a signed recovery decision.

## Key handling

- Never use `PRIVATE_KEY` environment variables with supplied deployment scripts.
- Use encrypted Foundry keystore, Ledger, or organization HSM/MPC.
- Do not expose provider secrets in frontend build variables. Use origin-restricted public credentials or a controlled proxy.
- Never log signatures, seeds, mnemonics, keystore passwords, session tokens, or raw compliance data.
