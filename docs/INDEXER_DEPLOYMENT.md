# Read-only indexer and Chain Scout deployment

The indexer has no signer and exposes read-only REST/SSE data. Its output is non-authoritative for browser writes.

## Build

From the repository root:

```bash
docker build -f deploy/indexer/Dockerfile -t stockpair-indexer:0.9.0 .
```

## Run

```bash
docker run --rm \
  --env-file /secure/path/indexer.env \
  -p 8787:8787 \
  stockpair-indexer:0.9.0
```

The image runs as the unprivileged `node` user and sets `HOST=0.0.0.0`. Put it behind a TLS reverse proxy/load balancer with health checks, connection limits, logs and DDoS controls.

## Required production posture

- Dedicated authenticated/archive HTTPS RPC with quotas and failover; optional WebSocket transport must use WSS.
- Exact v0.6 factory address, runtime hash and protocol version.
- Exact HTTPS `ALLOWED_ORIGINS` and concrete `ALLOWED_HOSTS`; never `*`.
- `TRUST_PROXY=true` only when every immediate proxy is listed in `TRUSTED_PROXY_IPS`.
- Request and SSE caps sized for the service and upstream proxy.
- Persistent durable checkpoint and event-journal storage, configured start block, reorg rewind and zero reported lag before claiming complete historical indexing.
- Monitoring for RPC lag, block gaps, reorgs, scanner failures, stream saturation and trust mismatch.
- No private key, wallet or write endpoint.

## Perimeter behavior

The service walks trusted proxy chains from right to left, ignores spoofed forwarded IPs from untrusted peers, accounts global/per-IP streams consistently and removes slow/backpressured clients. It permits cross-origin resource use only through exact CORS origins so a separately hosted Vercel frontend can read it.

## Health checks

Verify:

- `GET /health`
- `GET /api/config`
- `GET /api/network`
- `GET /api/launches`
- `GET /api/scout/summary`
- `GET /api/scout/contracts`
- `GET /api/scout/pools`
- `GET /api/scout/pending`
- `GET /api/scout/wallet-activity`
- `GET /api/scan/{token}`
- `GET /api/stream` returns `text/event-stream`

Compare `/api/config` trust fields with independent RPC verification. A clean API response is not sufficient authorization for a wallet transaction.

## Provider secret boundary

RPC credentials may be stored only in the container secret manager. `/health`, `/api/network`, Scout summaries and Robinhood capability endpoints expose a redacted endpoint descriptor, never the complete path/query/provider key. Treat any regression that returns `config.rpcUrl` as critical.

All clients require `X-StockPair-API-Version: 0.9.0`.
