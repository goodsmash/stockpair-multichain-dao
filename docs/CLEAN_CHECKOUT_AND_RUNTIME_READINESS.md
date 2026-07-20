# Clean checkout and runtime readiness

## Reproducible install

The repository has one npm workspace and one root `package-lock.json`. A clean checkout uses:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run doctor
```

`doctor` verifies Node/npm versions, workspace membership, lockfile ownership, dependency resolution and source-matched contract artifacts.

## Clean-copy verification

```bash
npm run verify:clean-install
```

This copies the repository without dependencies, build output, Git data or local state, installs only from the root lockfile, validates artifacts, runs UI contracts and creates a production browser build.

## Local readiness

```bash
npm run local
```

The command is ready only after it proves:

- local EVM RPC is listening;
- v0.6 launchpad is deployed and seeded;
- runtime code hash and protocol version match;
- indexer `/health` and `/api/config` report API v0.9 and exact trust anchors;
- SSE returns `event: ready`; and
- the Vite application returns the expected StockPair HTML.

Ctrl+C terminates all process groups and removes generated local environment/deployment files.
