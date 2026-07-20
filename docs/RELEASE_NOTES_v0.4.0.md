# StockPair v0.4.0 emergency security release

This release replaces the v0.3 trust model. It is a local/testnet remediation candidate, not an audit, certification, recovery guarantee, or authorization for mainnet value.

## Breaking changes

- New launchpad deployment and protocol-version hash.
- Stock assets must pass a conservative full-runtime non-proxy bytecode policy, including forged-metadata and jump-over-`INVALID` evasion checks.
- Privileged changes require scheduling and a 48-hour delay.
- Creator allocation maximum is 10% and is vested.
- Initial LP lock minimum is one year.
- All pool recipients must equal the actor.
- Swap input is capped at 5% of the input reserve.
- Stock configuration requires a positive minimum initial USD value.
- Browser writes require exact build-time factory address, runtime hash, and protocol version.
- Public operations UI is disabled unless an explicit separate build enables it.

## Security evidence

See `docs/SECURITY_TEST_REPORT.md`, `RELEASE_VERIFICATION.json`, and `qa/verification-logs/`.
