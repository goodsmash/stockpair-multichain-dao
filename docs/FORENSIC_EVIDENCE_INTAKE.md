# Forensic evidence intake

Use this checklist for the reported theft before changing or deleting infrastructure. Do not include seed phrases, private keys, passwords, session cookies, or unredacted personal data in a public issue.

## Required on-chain evidence

- Chain ID and network name.
- Affected factory, pool, token, locker, vesting, oracle, eligibility, and spender addresses.
- Every loss transaction hash and the preceding approval/permit transaction hashes.
- Victim address, asset, amount, and first-observed timestamp for each case.
- Deployed runtime bytecode and code hash at the incident block and current head.
- Proxy implementation/admin/beacon slots where applicable.
- Event logs, traces, calldata, internal calls, state diffs, and allowance changes.
- Owner, guardian, operator, oracle, and eligibility-gate changes before the incident.

## Required frontend and infrastructure evidence

- Exact served HTML/JavaScript/CSS bundles and SHA-256 hashes.
- Source maps, build manifest, release signature, deployment ID, and commit SHA.
- DNS, registrar, CDN/WAF, object-storage, hosting, CI/CD, GitHub, RPC, explorer, and monitoring audit logs.
- CSP violation reports, browser console/network captures, and affected URL/query parameters.
- Credential-rotation timeline and a record of who performed each containment action.

## Minimum incident record

```json
{
  "incidentId": "INC-YYYY-NNN",
  "reportedAtUtc": "YYYY-MM-DDTHH:MM:SSZ",
  "chainId": 0,
  "affectedDeployment": "0x...",
  "lossTransactions": ["0x..."],
  "approvalTransactions": ["0x..."],
  "knownMaliciousSpenders": ["0x..."],
  "frontendBundleHashes": ["sha256:..."],
  "containment": {
    "frontendOfflineAtUtc": null,
    "protocolPausedAtUtc": null,
    "credentialsRotatedAtUtc": null
  },
  "evidenceCustodian": "named responsible person",
  "notes": "Facts only; separate hypotheses from confirmed evidence."
}
```

Preserve original files read-only and calculate hashes before analysis. Work from copies. Maintain a timestamped chain of custody under legal counsel and an independent incident-response lead.
