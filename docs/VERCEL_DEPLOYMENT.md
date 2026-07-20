# Vercel deployment guide

Vercel serves only the static `apps/web` build. It does not host the long-running REST/SSE indexer in this architecture.

## 1. Prepare a verified deployment

Deploy v0.6 to the intended chain through the reviewed two-phase process. Independently record:

- chain ID;
- launchpad address;
- live runtime code hash;
- launchpad protocol version `0x154b42508933d53fbe3cac1f7e0e8ccf4a36169ed150f9171e2fae441e220309`;
- source commit, compiler and settings hashes; and
- owner/guardian/registry/oracle role addresses.

Do not reuse historical v0.3-v0.5 addresses.

## 2. Choose direct-only or hosted-indexer mode

The static site can deploy with `VITE_INDEXER_URL` blank. In this mode it uses bounded direct RPC reads and does not contact localhost or the Vercel origin for API routes. This is sufficient for current state and recent discovery, not durable history.

For persistent history, SSE and signed alerts, deploy `deploy/indexer/Dockerfile` to a persistent container service with HTTPS, health monitoring and exact `ALLOWED_ORIGINS`. Confirm `/health`, `/api/config` and `/api/stream` before setting its origin in Vercel.

## 3. Import the repository root

The included `vercel.json` defines:

- Vite framework;
- one root `npm ci` workspace install;
- fail-closed `build:vercel` command;
- `apps/web/dist` output;
- SPA routing; and
- security/cache headers.

Do not set the Vercel root directory to `apps/web`; the configuration assumes repository-root import.

## 4. Set Production environment variables

Use the exact variables in `docs/ENVIRONMENT_REFERENCE.md`. `VITE_EXPLORER_URL` must be an origin. `VITE_INDEXER_URL` may be blank; when set, it must be an HTTPS origin. The build rejects HTTP, localhost, embedded credentials, zero trust anchors, invalid direct lookback, unpinned DEX adapters and missing deployment acknowledgement in Production.

Keep `VITE_ENABLE_OPERATIONS=false`.

## 5. Preview validation

Before promoting Production:

```bash
npm run build:web:vercel
```

Then complete `docs/USER_ACCEPTANCE_TESTS.md`, including deliberate wrong hash/version tests on a disposable Preview. Verify that wrong direct on-chain trust anchors produce a red lock, while an unavailable/mismatched indexer produces an amber degraded-data state and cannot authorize writes.

## 6. Production controls

- Protect Vercel account and domain/DNS with phishing-resistant MFA.
- Restrict production deployments and environment changes to reviewed teams.
- Enable deployment protection for previews containing live trust anchors.
- Monitor deployment/bundle hashes, domain/DNS changes, CSP violations and unusual wallet prompts.
- Roll back static assets only to a release matching the same on-chain protocol; never point an older browser at an incompatible deployment.

## 7. Not performed by this handoff

This repository does not create the Vercel project, configure its account permissions, issue domains/certificates or validate the final public deployment. Preserve screenshots, response headers and build logs as production evidence.

## v0.9 reproducibility

Do not add a Vercel project root override or a second browser install. The root `package-lock.json`, Node 22.16.0 and `npm run build:web:vercel` are the reviewed path. Every `VITE_*` variable is public; use only a browser-safe, origin-restricted RPC key.


## v0.9 direct-only acceptance

Build once with `VITE_INDEXER_URL` empty. Inspect the output and confirm no `127.0.0.1:8787` string, same-origin `/api` dependency or EventSource is used before a compatible handshake. Then test network state, recent discovery, token metadata, scanner and configured factory reads through the browser-safe RPC.
