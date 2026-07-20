# Safe early-launch toolkit

The term “sniping” is used here only for rapid, transparent launch discovery and user-authorized entry. The toolkit must not front-run, sandwich, spam, bypass anti-bot controls, evade allowlists or custody a user key.

## Read-only tools included

- Chain Scout contract, token, pool, swap and deployer discovery.
- Launch Radar normalization and evidence-based ranking.
- Near-launch alert rules.
- Source descriptors for V2, V3, V4, bonding curves and LBPs.
- Read-only SDK and `stockpair-radar` CLI.
- OpenAPI and JSON Schemas.
- Unsigned execution-plan format.

## Recommended user features

- New launches, rising activity, near graduation and newly graduated views.
- Canonical pool/migration proof and copycat-pool warnings.
- Creator acquisition, vesting, lock and deployer-history panels.
- Hook-aware Uniswap v4 risk cards.
- Price-impact ladder, max-position calculator and simulation results.
- Watchlists, local/private alert preferences and signed webhooks.
- “Why this alert?” evidence trace instead of opaque scores.
- One-click revoke and session-key expiration controls.

## Guardrails for any future execution module

- User-owned wallet or tightly bounded account-abstraction session key.
- Allowlisted chain, factory, router, pool and function selectors.
- Direct-chain provenance refresh immediately before simulation and signing.
- Exact approval amount; revoke residual allowances.
- Per-trade, per-token and daily spend caps.
- Maximum slippage, maximum price impact, short deadline and cooldown.
- Recipient must be the user account.
- Simulation and decoded transaction review are mandatory.
- No automatic retry that changes economics or increases fees/limits.
- Immediate pause/revoke control visible to the user.
