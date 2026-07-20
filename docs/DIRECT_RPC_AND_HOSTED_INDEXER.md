# Direct RPC fallback and hosted indexer

StockPair v0.9 separates **minimum viable chain reads** from **durable indexed intelligence**. The static browser must remain useful when the separately hosted indexer is missing or unavailable, but the fallback is intentionally bounded and cannot replace an archive indexer.

## Static Vercel mode

Set `VITE_INDEXER_URL` to an empty value and keep:

```dotenv
VITE_DIRECT_RPC_FALLBACK=true
VITE_DIRECT_RPC_LOOKBACK=100
```

The production environment validator accepts a blank indexer origin only when direct fallback is enabled. The built bundle does not default to `127.0.0.1:8787`, does not request `/api/*` from the Vercel origin, and does not open an EventSource until an exact v0.9 indexer handshake has succeeded.

The browser reads directly from the configured `VITE_RPC_URL` for:

- chain ID, block number and gas price;
- configured StockPair factory launches and markets;
- connected-wallet token and LP balances;
- recent top-level contract creations;
- ERC-20-like name, symbol, decimals and supply probes;
- bounded bytecode/proxy-slot scanner evidence; and
- launch Radar candidates derived from the bounded discovery set.

The first recent-deployment scan covers at most 100 blocks. Later polls scan only blocks produced since the previous successful poll. Duplicate observations are removed and the in-memory set is bounded.

## Fallback limitations

Direct RPC mode does not provide durable history, reorg replay, long-window deployer statistics, historical holder snapshots, complete pool/swap history, signed server webhooks or archive-grade evidence. A public browser RPC credential is visible to users and must be origin-restricted and rate-limited.

Failure of the hosted indexer is shown as degraded intelligence, not as evidence that direct-chain writes are safe. Every write still runs the complete direct-chain authorization path.

## Hosted indexer

Use one of the templates in `deploy/hosted/`:

- `render.yaml`
- `fly.toml`
- `railway.json`

The container is unprivileged and read-only. Configure all secrets in the hosting provider, not in Git. At minimum provide a dedicated HTTPS RPC, exact launchpad trust anchors, exact browser origins and every public/health-check hostname.

After deployment, verify:

```bash
curl -fsS https://INDEXER/health
curl -fsS https://INDEXER/api/config
curl -fsS https://INDEXER/api/network
curl -fsSI https://INDEXER/api/stream
```

Every response must include `X-StockPair-API-Version: 0.9.0`. Only then set `VITE_INDEXER_URL` to the HTTPS origin and rebuild the browser.

## Compatibility behavior

The browser and SDKs require an exact REST handshake before accepting data or opening SSE. A stale, substituted, non-JSON or oversized service is rejected. When compatibility is lost, the stream is closed and the browser returns to bounded direct RPC mode.
