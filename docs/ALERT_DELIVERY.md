# Alert delivery and watchlists

StockPair v0.9 has two distinct alert layers.

## Browser-local alerts

The watchlist, theme, Quick Buy settings and launch-notification preference are stored only in the browser. With user permission, newly observed mainnet deployments can produce a desktop notification and sound. Watchlist events shown in the UI include pool creation, large swaps, liquidity removal, ownership changes and emergency changes when the required evidence is available.

There is no browser-side email delivery and no user webhook secret is stored in localStorage.

## Server-side signed delivery

The hosted read-only indexer can deliver bounded alerts to:

- an HTTPS webhook;
- Discord; and
- Telegram.

Enable with `ALERT_DELIVERY_ENABLED=true` and configure credentials only in the host secret manager. Generic webhook messages include a timestamp, idempotency identifier and HMAC-SHA256 signature. Delivery uses a bounded queue, timeout, retry limit and no redirects. Payloads never contain RPC credentials, signing keys or private wallet data.

Supported event kinds include:

- token detected;
- pool created;
- large reserve-relative swap;
- liquidity removed;
- ownership changed; and
- emergency state changed.

`PROTOCOL_ALERTS_ENABLED` controls incremental StockPair protocol-event observation. `ALERT_LARGE_SWAP_BPS` sets the reserve-relative threshold. The first poll establishes a baseline to prevent a deployment-time alert flood.

## Verification endpoint

```text
GET /api/alerts/status
```

The endpoint returns bounded operational state for delivery and protocol observation. It never returns webhook secrets or bot credentials.

## Receiver verification

A receiver must calculate HMAC-SHA256 over the documented timestamp/body input with the shared secret, compare using a constant-time operation, reject stale timestamps and deduplicate by event ID. The JSON contract is in `integrations/schemas/webhook-event.schema.json` with an example in `integrations/examples/webhook-event.example.json`.

## Evidence boundary

Flow/manipulation alerts and deployer scores are heuristics, not proof of fraud. `knownRugPulls` remains unknown unless a reviewed source supplies that evidence. Operators must preserve the underlying transaction/block evidence shown in the event.
