# Deployment readiness

## Current repository state

StockPair v0.9.0 contains a reproducible single-lockfile workspace, built static browser, optional hosted read-only indexer, bounded direct-RPC fallback, Robinhood-native read integrations, reviewed-hash-gated V2/V3 execution, scanner/reputation/flow warnings, signed alert delivery, guarded mainnet tooling, GitHub/Vercel/container automation and complete release evidence. The Solidity protocol identifiers remain v0.6.0.

## Ready for controlled engineering deployment

- Clean GitHub checkout and root `npm ci`.
- Vercel static build with a blank `VITE_INDEXER_URL`.
- Current network/factory/recent-discovery/portfolio/scanner views through browser direct RPC.
- Optional unprivileged indexer deployment through Render, Fly.io, Railway or another container host.
- Exact v0.9 API compatibility and SSE handshake.
- External DEX adapters only after canonical addresses and runtime-code hashes are reviewed.
- User-signed Quick Buy with confirmation, risk, cap, slippage and impact limits.
- HMAC webhook/Discord/Telegram alerts configured through server secrets.
- Local disposable full-stack development.
- GitHub CI, CodeQL, dependency review and release automation.

## Not executed by this release

- Vercel, GitHub, Render, Fly.io or Railway account deployment.
- Robinhood testnet/mainnet contract transactions.
- Funding a production deployer.
- Production external DEX adapter enablement or live trade.
- Creation of a real StockPair market.
- User email subscriptions.
- Persistent database/reorg rewind implementation.

## Mandatory real-value gates

- independent smart-contract and economic audit;
- independent browser/indexer/infrastructure penetration review;
- target-chain testnet/staging deployment and reorg/RPC-failure exercises;
- current canonical stock-token, source-verification, oracle and eligibility evidence;
- canonical external DEX registry and runtime-hash review;
- hardware-backed owner/guardian multisig setup and monitoring;
- durable storage, backups, RPC failover, alerting and incident rehearsal;
- final account/domain/DNS/CDN/CI security configuration; and
- legal, RWA/securities, sanctions, privacy and jurisdictional authorization.

The reported historical loss remains unresolved without transaction and infrastructure evidence. This repository does not recover funds, change historical contracts or guarantee the absence of unknown vulnerabilities.
