# Hosted read-only indexer templates

These templates deploy only the unprivileged, read-only StockPair indexer. They do not deploy contracts, hold keys, sign transactions, or enable production trading.

## Shared mandatory configuration

Copy `services/indexer/.env.example` into the provider secret manager. At minimum set:

- `RH_CHAIN_ID`, `RH_CHAIN_NAME`
- dedicated authenticated `RH_RPC_URL` using HTTPS
- optional `RH_WS_URL` using WSS
- `RH_EXPLORER_URL`
- exact `LAUNCHPAD_ADDRESS`, runtime hash and protocol version
- exact HTTPS `ALLOWED_ORIGINS`
- every externally visible and health-check hostname in `ALLOWED_HOSTS`

Keep `PRODUCTION_TRADING_ENABLED=false` until all production gates are independently approved. The public indexer remains non-authoritative for wallet writes in either state.

## Render

Use `deploy/hosted/render.yaml` as a Blueprint. Secret values are marked `sync: false`. Confirm the final Render hostname is present in `ALLOWED_HOSTS` before the first health check.

## Fly.io

Copy `deploy/hosted/fly.toml`, replace the placeholder `app`, then put all deployment-specific values in `fly secrets`. Keep one Machine running because SSE connections and in-memory observations are not compatible with scale-to-zero continuity.

## Railway

Set the service config path to `/deploy/hosted/railway.json`. Railway health checks use `healthcheck.railway.app`; include that hostname and the generated public service hostname in `ALLOWED_HOSTS`.

## Verification

After TLS is active, run:

```bash
curl -fsS https://YOUR_INDEXER/health
curl -fsS https://YOUR_INDEXER/api/config
curl -fsS https://YOUR_INDEXER/api/network
curl -fsSI https://YOUR_INDEXER/api/stream
```

Every response must include `X-StockPair-API-Version: 0.9.0`. Then set the Vercel `VITE_INDEXER_URL` to the HTTPS origin and rebuild. The browser continues to use direct RPC fallback when this service is unavailable.
