# Robinhood account abstraction integration

Robinhood Chain documents ERC-4337 and EIP-7702 support. The reviewed mainnet profile includes EntryPoint v0.6, v0.7 and v0.8, SenderCreator addresses, and Safe 4337 module metadata.

## Bounded policy requirements

A StockPair session policy is disabled by default. Enabling it requires:

- exact target-address allowlist;
- exact four-byte selector allowlist;
- per-call value cap;
- total value cap;
- future expiry;
- immediate revocation path;
- user-controlled authorization;
- no arbitrary calls, delegate execution or private-key storage.

Paymaster sponsorship is a separate trust boundary. Sponsorship rules must bind chain, EntryPoint, sender, target, selector, token/value limits, time window, rate limits and revocation. Never interpret sponsorship as protocol safety or token approval.

The v0.8 API only describes network capability and produces a policy object. It does not build, sign, submit or sponsor a `UserOperation`.
