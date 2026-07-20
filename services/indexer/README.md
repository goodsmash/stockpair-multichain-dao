# StockPair read-only indexer, scanner, and Chain Scout

This service reads operator-configured JSON-RPC and Blockscout-compatible endpoints. It has no signer, private-key import, transaction relay, mutable listing endpoint, or browser-selectable upstream URL.

```bash
cp services/indexer/.env.example services/indexer/.env
set -a; . services/indexer/.env; set +a
npm run dev:indexer
```

## Trust requirements

`LAUNCHPAD_ADDRESS`, `LAUNCHPAD_CODE_HASH`, and `LAUNCHPAD_PROTOCOL_VERSION` are separate mandatory trust anchors for a production execution verdict. The service reads the live bytecode and protocol constant and returns `factoryTrust` to clients. `PRODUCTION_TRADING_ENABLED=true` is rejected when these values are absent or when a shared public Robinhood RPC is configured.

The browser must still verify the same values directly from chain. An indexer verdict is never sufficient authority for a wallet write.

## Protocol endpoints

- `GET /health`
- `GET /api/config`
- `GET /api/network`
- `GET /api/launchpad`
- `GET /api/stocks`
- `GET /api/launches?limit=40`
- `GET /api/activity?blocks=25000`
- `GET /api/scan/:token`
- `GET /api/portfolio/:wallet`

## Chain Scout endpoints

- `GET /api/scout/summary`
- `GET /api/scout/contracts?limit=100&chainId=&status=&q=`
- `GET /api/scout/tokens?limit=100&chainId=&status=&q=`
- `GET /api/scout/pools?limit=100&chainId=&q=`
- `GET /api/scout/swaps?limit=100&chainId=&q=`
- `GET /api/scout/events?limit=100&chainId=&q=`
- `GET /api/scout/deployer/:chainId/:address`
- `GET /api/scout/code/:runtimeCodeHash`
- `GET /api/scout/labels`
- `GET /api/stream` — Server-Sent Events with global and per-IP caps

## Network perimeter

- `ALLOWED_ORIGINS` must contain exact origins; wildcard is rejected.
- `TRUST_PROXY=false` is the safe default. Enable it only behind a trusted reverse proxy that overwrites forwarded headers, and list the proxy address in `TRUSTED_PROXY_IPS`.
- Apply TLS/HSTS, body/header/time limits, DDoS controls, structured redacted logging, metrics, and durable rate limiting at the reverse proxy and edge.
- Never expose RPC credentials to the browser. Use an origin-restricted endpoint or a controlled proxy.

## Execution gate

A displayed launch is executable only when factory trust, factory registration, stock registry, code hash, pool state, scanner, oracle, compliance, and explorer-verification policy all pass. Proxy evidence, dangerous selector evidence, changed bytecode, scanner unavailability, or source-verification loss fail closed.

Scanner and Scout output are heuristic. They cannot prove safety or identify a private person. Arbitrary discovered contracts remain investigation-only; only factory pools against operator-approved stock contracts can become executable.
