# GitHub repository handoff

## Initial publication

Create a private repository first, review the clean release tree, then push without any `.env`, local deployment state, keys or dependency directories.

```bash
git init
git add .
git commit -S -m "release: StockPair App v0.9.0"
git branch -M main
git remote add origin <reviewed-repository-url>
git push -u origin main
```

## Repository settings required

Configure manually because owner/team names are organization-specific:

- branch protection or ruleset for `main`;
- required successful checks from CI, EVM matrices, Foundry, Slither, CodeQL and dependency review;
- at least two reviewers for contract/browser-security/indexer-perimeter files;
- signed commits/tags and linear history policy;
- restricted force-push/deletion;
- private vulnerability reporting and security advisories;
- GitHub environment approval for production deployment workflows;
- least-privilege Actions permissions;
- Dependabot alerts/updates and secret scanning/push protection; and
- CODEOWNERS mapped to real security/protocol/frontend teams.

## Included automation

- `ci.yml`: compile, quick suite, UI/security tests, 13 isolated EVM scenarios, Foundry and Slither.
- `codeql.yml`: JavaScript/TypeScript analysis.
- `dependency-review.yml`: high-severity and reviewed-license gate.
- `release.yml`: verifies a signed/verified tag, runs release checks, builds the web bundle and publishes a clean ZIP/checksum.
- `dependabot.yml`: locked npm and Actions update proposals.

Review third-party Action major versions before enabling workflows. Pin commit SHAs if required by organizational policy.

GitHub-hosted runners are the reviewed default. Self-hosted runners must support Node 24-based Actions; use Actions Runner `2.329.0` or newer and keep it patched before enabling these workflows. Older self-hosted runners must not be used as a release bypass.

## Tagging v0.9.0

Only tag after all required checks and independent release approval:

```bash
git tag -s v0.9.0 -m "StockPair App v0.9.0"
git push origin v0.9.0
```

The release workflow assumes branch protection prevented an unverified tag target from bypassing the 13 EVM scenarios. Do not treat a generated ZIP as audit evidence by itself.

## Security response

Never ask reporters to publish an exploit in a public issue. Use private vulnerability reporting, preserve evidence and follow `docs/INCIDENT_RESPONSE.md` and `docs/FORENSIC_EVIDENCE_INTAKE.md`.

## Clean-checkout gate

The release branch must pass `npm run verify:clean-install`. CI uses one root lockfile; nested lockfiles or workspace-specific install steps are prohibited.
