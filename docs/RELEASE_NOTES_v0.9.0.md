# StockPair v0.9.0 release notes

v0.9 is the clean-checkout, production-resilience, direct-RPC, external-route and alert hardening release. The Solidity protocol bytecode and identifiers remain v0.6.0.

## Reproducible deployment

- One root npm workspace and lockfile for the browser, indexer and SDKs.
- Node 22.16.0 pin with Vite-compatible minimum enforcement.
- Clean dependency-empty verification.
- Shared root installation for local development, Vercel, GitHub and Docker.
- Local readiness only after EVM, trust anchors, API, seeded market, SSE and UI respond.

## Static Vercel resilience

- `VITE_INDEXER_URL` may be empty.
- No localhost or static-origin API fallback is embedded in the production bundle.
- Bounded direct RPC reads cover current network state, configured markets, portfolio reads, recent contract creations, token probes, scanner evidence and Radar.
- Initial discovery is capped at 100 blocks; subsequent polling processes only new blocks every three seconds.
- A compatible hosted indexer reconnects only after an exact API v0.9 handshake.

## Trading and fast launch review

- Added V2/V3 factory/pool discovery, quoting and user-signed buy/sell execution.
- All route components require reviewed nonzero runtime hash pins.
- Quote and route evidence are refreshed before signature.
- Exact allowances, zero-first replacement, residual revocation, block confirmations, risk threshold, maximum buy, slippage, price impact and recipient checks are enforced.
- Quick Buy defaults to 0.001 ETH but remains the normal decoded review and wallet-confirmation flow.

## Scanning, reputation and alerts

- Added bounded direct bytecode/proxy scanner evidence and optional Blockscout source/holder enrichment.
- Added deployer activity/lifespan/liquidity evidence scores without inventing rug-pull history.
- Added self, reciprocal, circular and matched-size flow warnings with confidence and limitations.
- Added HMAC-signed HTTPS webhook, Discord and Telegram delivery.
- Added protocol alerts for reserve-relative large swaps, liquidity removal, ownership changes and emergency changes.
- Browser watchlists, theme, Quick Buy preferences and desktop/sound notifications remain local to the browser.

## Deployment handoff

- Added Render, Fly.io and Railway indexer templates.
- Added guarded simulation-first Robinhood mainnet scripts.
- Added direct-fallback, DEX, alert and mainnet runbooks plus machine-readable build-list status.

## Security boundary

No code in the indexer or SDK signs transactions. External DEX adapters are disabled by default. No hosted provider or Robinhood mainnet deployment was executed. Reputation and manipulation outputs are warnings, not fraud determinations. Independent security, economic, infrastructure and legal review remain mandatory.
