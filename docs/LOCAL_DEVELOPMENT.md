# Local development

## Supported environment

- Node.js 22.16.0 (`nvm use` reads `.nvmrc`; minimum supported 22.12).
- npm 10.x.
- Linux, macOS or Windows with a POSIX-compatible shell for deployment scripts. The core local demo is Node-based and works from PowerShell, Command Prompt or a terminal.

## First setup

```bash
npm run setup
```

The setup command performs one locked root workspace install, verifies that the packaged Solidity artifacts exactly match the current source bundle, and runs the UI contract tests.

## One-command full demo

```bash
npm run local
```

Services:

| Service | URL | Purpose |
|---|---|---|
| Browser app | `http://127.0.0.1:5173` | Vite UI |
| Read-only API | `http://127.0.0.1:8787/health` | indexer/scanner/Scout |
| Local EVM JSON-RPC | `http://127.0.0.1:8545` | disposable Ganache chain |

The demo deploys a mock approved stock token, feed, eligibility gate, launchpad, launch token, pool, LP locker and creator vesting vault. It seeds one market and funds an unlocked local trader.

The demo creates `apps/web/.env.local` and `deployments/local.json` only while running. Normal shutdown removes both automatically. `npm run clean:local` removes stale copies after an abnormal interruption.

## Browser wallet

A normal injected wallet will not automatically have the in-memory Ganache account. For UI reading, no wallet is required. For write-path testing, import only the disposable key shown by your own local Ganache tooling and delete it afterward. Never reuse a real wallet or key.

## Common commands

```bash
npm run doctor               # verify Node/npm/workspace/lock/artifact posture
npm run verify:clean-install # reproduce from a dependency-empty copy
npm run compile              # rebuild solc-js artifacts after Solidity changes
npm run local:fresh          # rebuild artifacts, then launch the full demo
npm test                     # quick deterministic suite
npm run test:ui              # required UI surface/security contracts
npm run build:web            # production web bundle
npm run check:release        # repository handoff gate
npm run verify               # combined quick/release verification
```

## Troubleshooting

### `µWS` native binary warning

Ganache may fall back to a slower JavaScript implementation on newer Node builds. This is a performance warning, not a passing test. Run deployed-bytecode scenarios independently and require a completed TAP result.

### Vite shows the wrong chain

Stop the demo, remove `apps/web/.env.local`, then restart `npm run local`. The deployment script recreates exact local trust anchors.

### Port already in use

Stop existing processes on 5173, 8787 or 8545. The demo intentionally uses fixed ports so the generated browser configuration and CORS allowlist are deterministic.

### Production build rejects localhost

Expected behavior. Remove `.env.local` or supply reviewed HTTPS production environment values. Production output must never contain localhost RPC/API origins.
