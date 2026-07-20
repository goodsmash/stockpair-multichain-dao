# Agent start here — v0.9

## Version boundary

- Application, indexer and SDKs: `0.9.0`
- Solidity protocol and deployed-bytecode identifiers: `0.6.0`
- Indexer compatibility header: `X-StockPair-API-Version: 0.9.0`

Do not change protocol hashes merely to match the application version.

## First commands

```bash
nvm use
npm ci --ignore-scripts --no-audit --no-fund
npm run doctor
npm run validate:artifacts
npm run test:quick
npm run local
```

There is one root workspace lockfile. Do not add a nested lockfile or a second install command.

## Non-negotiable invariants

- No private key, mnemonic, signer, approval or transaction broadcast in the indexer or SDKs.
- No indexer response authorizes a browser write.
- Browser writes require direct-chain factory/pool/token/oracle verification and explicit wallet review.
- API clients require exact version `0.9.0`.
- Production RPC/WS/indexer/explorer connections use TLS.
- Server-side RPC credentials are never returned in API responses or logs.
- Operations stay disabled in the public Vercel build.
- No front-running, sandwiching, anti-bot bypass or autonomous unlimited execution.

## Change sequence

1. Document the threat or runtime defect.
2. Add a failing executable regression.
3. Implement the smallest coherent fix.
4. Run targeted tests.
5. Run `npm run test:quick`.
6. Run affected isolated EVM scenarios.
7. Run `npm run verify:clean-install`.
8. Run local and production-mode smoke tests.
9. Update release evidence and checksums.

Read `docs/V0.9.0_REJECTION_REMEDIATION.md`, `docs/INDEXER_API_COMPATIBILITY.md`, `docs/LOCAL_DEVELOPMENT.md`, `docs/VERCEL_DEPLOYMENT.md` and `SECURITY.md` before editing deployment or trust code.
