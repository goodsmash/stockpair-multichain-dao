# Configuration rules

- Example addresses are placeholders and are intentionally non-deployable.
- Confirm the chain ID from the connected RPC before signing.
- Obtain each Stock Token and Chainlink feed address from the current official Robinhood directory; verify bytecode and token metadata independently.
- Use a dedicated production RPC. Public endpoints are suitable for development and may be rate-limited.
- `maxOracleAgeSeconds` must account for the documented 24/5 update model and weekends while still failing closed on abnormal staleness.
- Keep `requireFreshOracleForSwaps=false` unless product policy intentionally halts AMM swaps outside the oracle freshness window. Launches always require a healthy stock feed.
- Mainnet owner must be a multisig; guardian must be operationally separate; compliance enforcement must remain enabled.
