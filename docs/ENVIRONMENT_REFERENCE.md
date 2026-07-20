# Environment reference

## Browser and Vercel variables

Every `VITE_*` value is public and compiled into the browser bundle. Never put private RPC credentials, secrets or access tokens in these variables.

| Variable | Required | Validation |
|---|---:|---|
| `VITE_CHAIN_ID` | yes | Positive integer equal to target deployment chain. |
| `VITE_CHAIN_NAME` | yes | Bounded user-visible name. |
| `VITE_RPC_URL` | yes | HTTPS in production; no embedded credentials. RPC path is permitted. |
| `VITE_EXPLORER_URL` | yes | HTTPS origin only; no path/query/fragment/credentials. |
| `VITE_INDEXER_URL` | optional | HTTPS origin only when set. Leave blank for bounded direct-RPC mode. |
| `VITE_LAUNCHPAD_ADDRESS` | production | Exact non-zero verified deployment address. |
| `VITE_LAUNCHPAD_CODE_HASH` | production | `keccak256` of live launchpad runtime code. |
| `VITE_LAUNCHPAD_PROTOCOL_VERSION` | production | Must equal `0x154b42508933d53fbe3cac1f7e0e8ccf4a36169ed150f9171e2fae441e220309`. |
| `VITE_DEPLOYMENT_ACK` | production | Exact text `I_HAVE_VERIFIED_THE_FACTORY`. |
| `VITE_ENABLE_OPERATIONS` | always | Must remain `false` on public Vercel. |
| `VITE_DIRECT_RPC_FALLBACK` | always | Must be `true` for the resilient public build. |
| `VITE_DIRECT_RPC_LOOKBACK` | always | Integer 1–100; initial recent-deployment scan limit. |
| `VITE_DEX_ADAPTERS_JSON` | optional | Reviewed V2/V3 adapters. Every route component requires a nonzero runtime hash; empty means disabled. |

Generate and independently review trust anchors with `scripts/verify-deployment.mjs`. Compare the result with the deployment transaction, source commit, compiler settings and authenticated release record.

## Indexer variables

The indexer is server-side and read-only. Inject secrets through the hosting secret manager, not repository files.

| Variable | Default | Purpose/rule |
|---|---|---|
| `HOST` | `127.0.0.1` | Container sets `0.0.0.0`; expose only behind TLS/proxy. |
| `PORT` | `8787` | HTTP listener. |
| `RH_CHAIN_ID` | `46630` | Primary chain ID. |
| `RH_CHAIN_NAME` | testnet label | Display label. |
| `RH_RPC_URL` | configured public endpoint | Use a dedicated authenticated/archive HTTPS RPC for production. The complete URL is secret and is redacted from public API responses. |
| `RH_EXPLORER_URL` | configured explorer | HTTPS public explorer URL; query strings are rejected. |
| `RH_WS_URL` | unset | Optional production WebSocket endpoint; must use WSS. |
| `LAUNCHPAD_ADDRESS` | zero | Exact v0.6 deployment. |
| `LAUNCHPAD_CODE_HASH` | zero | Exact runtime hash. |
| `LAUNCHPAD_PROTOCOL_VERSION` | zero | Exact v0.6 launchpad version hash. |
| `PRODUCTION_TRADING_ENABLED` | `false` | Read-side verdict; browser still verifies independently. |
| `REQUIRE_EXPLORER_VERIFICATION` | `true` | Fail closed when required verification evidence is absent. |
| `ALLOWED_HOSTS` | local hostnames | Exact public indexer hostname(s); wildcard, scheme, path and credentials are rejected. |
| `ALLOWED_ORIGINS` | local Vite origins | Exact comma-separated origins. Wildcard, credentials, paths, queries and fragments are rejected. Production origins require HTTPS. |
| `TRUST_PROXY` | `false` | Enable only behind a reviewed proxy chain. |
| `TRUSTED_PROXY_IPS` | loopback | Exact proxy IPs trusted when walking `X-Forwarded-For` right-to-left. |
| `REQUEST_LIMIT_PER_MINUTE` | `120` | Per-resolved-client request limit. |
| `MAX_SSE_CONNECTIONS` | `100` | Global event-stream cap. |
| `MAX_SSE_PER_IP` | `3` | Per-client event-stream cap. |
| `SCOUT_*` | example config | Bounded lookback/polling, chains, labels and DEX events. |
| `LAUNCH_ALERT_RULES_FILE` | example config | JSON object containing a bounded `rules` array for read-only alert evaluation. Matching does not send transactions. |
| `LAUNCH_ALERT_RULES_JSON` | unset | Optional inline override; use hosting secrets/config, not browser variables. |
| `LAUNCH_RADAR_POLICY_FILE` | example config | Review/scoring and guarded-execution policy input. It never authorizes a signature. |
| `LAUNCH_RADAR_POLICY_JSON` | unset | Optional inline override, validated and bounded. |
| `ALERT_DELIVERY_ENABLED` | `false` | Enables server-side webhook/Discord/Telegram delivery only. |
| `ALERT_WEBHOOK_URL` | unset | HTTPS receiver; requires a server-side HMAC secret. |
| `ALERT_WEBHOOK_SECRET` | unset | Secret-manager-only HMAC key; never returned publicly. |
| `DISCORD_WEBHOOK_URL` | unset | Server-side Discord target. |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | unset | Server-side Telegram target. |
| `PROTOCOL_ALERTS_ENABLED` | `true` | Incremental ownership/emergency/liquidity/large-swap observation. |
| `ALERT_LARGE_SWAP_BPS` | `100` | Reserve-relative large-swap threshold. |

The indexer response includes version/trust metadata for observability, but those values never replace direct browser RPC verification.

## Local generated files

`npm run local` writes disposable, ignored files:

- `deployments/local.json`
- `apps/web/.env.local`

Remove them before packaging. Never reuse deterministic local accounts or keys.

## Robinhood-native integration variables

| Variable | Default | Purpose/rule |
|---|---|---|
| `ROBINHOOD_REGISTRY_FILE` | `integrations/robinhood/registry.json` | Reviewed network, protocol-contract, precompile, AA and token metadata. Treat it as a pinned review artifact, not a self-updating oracle. |
| `RH_EXPECTED_ARBOS_VERSION` | documented registry value | Operator expectation used by the node/upgrade posture endpoint. A mismatch is a review trigger; automatic node upgrades remain disabled. |

The stock-token feed example intentionally contains no production feed addresses. Resolve canonical token addresses from Robinhood's official on-chain asset registry and current price feeds/heartbeats from Chainlink's Robinhood feed registry at deployment time. Never infer canonical status from a ticker symbol.

## API compatibility

The indexer emits `X-StockPair-API-Version: 0.9.0`. Browser and SDK clients reject missing or mismatched values. Coordinate version changes across server, browser, SDKs, OpenAPI and tests.
