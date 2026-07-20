# Security incident response

This runbook applies when users report stolen tokens, malicious approvals, unexpected swaps, governance changes, frontend replacement, DNS/CDN compromise, RPC manipulation, oracle failure, or contract exploitation.

## First 30 minutes

1. Take the public write-enabled frontend offline or replace it with a static incident page. Do not redeploy an unreviewed build.
2. Guardian pauses the protocol globally, then blocks affected pools and stock assets where narrower containment is useful.
3. Preserve the exact frontend bundle, source-map hashes, DNS/CDN/registrar audit logs, CI logs, deployment records, RPC responses, browser console/network captures, and timestamps.
4. Record every affected chain, contract, wallet, transaction hash, approval spender, token, pool, amount, and first-observed time.
5. Revoke compromised CI, CDN, DNS, registrar, cloud, RPC, explorer, monitoring, and signing credentials. Do not rotate away evidence before it is preserved.
6. Publish only verified facts: affected addresses, known malicious spenders, containment status, and safe revocation instructions. Do not claim recovery or identify an attacker without evidence.

## User containment

- Tell users to stop using the compromised site and verify the official incident domain through an independent channel.
- Publish exact malicious spender addresses and chain IDs.
- Direct users to revoke approvals using a trusted wallet or explorer interface. Never ask for a seed phrase, private key, or remote-control access.
- Warn users that revocation cannot reverse completed transfers.
- Do not direct users to send funds to a “recovery wallet.”

## Investigation

Classify each loss path separately:

- malicious or replaced frontend;
- compromised DNS/CDN/build pipeline;
- malicious indexer/API response;
- wallet approval to an untrusted spender;
- owner/guardian/signing compromise;
- factory, pool, token, locker, vesting, oracle, gate, or proxy defect;
- approved stock-token behavior change;
- RPC or explorer deception;
- user device or wallet compromise.

For every transaction, reconstruct calldata, sender, recipient, spender, allowance, emitted events, state changes, code hashes, implementation slots, and preceding approvals. Compare the deployed bytecode with the frozen release artifact. A source-code patch does not repair an already deployed immutable contract.

## External escalation

Engage independent smart-contract incident responders, chain analytics, legal counsel, relevant exchanges/bridges, insurers, law enforcement, regulators, and the affected infrastructure providers as appropriate. Preserve privilege and evidence-handling requirements under counsel.

## Recovery decision

Do not unpause or publish a replacement until:

- root cause is supported by transaction and infrastructure evidence;
- all affected trust boundaries are replaced or remediated;
- exploit regression tests fail on the old design and pass on the replacement;
- deployed bytecode and frontend hashes are independently verified;
- user migration and approval-revocation communication is reviewed;
- security, operations, legal/compliance, and product/risk owners sign the decision.

No source package can guarantee recovery of stolen assets or prevent every future exploit.
