# Scanner and execution gate

## Objective

Reduce exposure to obvious honeypots, malicious transfer controls, proxy surprises, spoofed stock tokens, and compromised registry entries without pretending static heuristics can prove safety.

## Signals

The scanner reads the contract through JSON-RPC and, when configured, a Blockscout-compatible API. It checks:

- runtime bytecode exists;
- runtime hash matches the launchpad-pinned hash;
- token reports 18 decimals;
- registry approval and emergency flags;
- EIP-1967 implementation, beacon, and admin slots;
- EIP-1167 minimal-proxy patterns;
- selectors associated with blacklist, bot list, adjustable buy/sell tax, trading switch, max transaction/wallet, mint, pause, ownership, and upgrade controls;
- explorer source verification and changed-bytecode flags;
- exposed owner/paused state when readable; and
- concentration among the top sampled holders.

These signals can create false positives and false negatives. Dynamic sell simulation is not a universal proof because behavior may depend on caller, block, amount, allowlists, or hidden external state.

## Fail-closed execution rules

A scanner result is executable only when:

- the token is an enabled stock in the launchpad registry;
- the exact runtime hash matches the approved hash;
- it has runtime code and 18 decimals;
- no stock emergency block is active;
- no changed-bytecode signal is present;
- required explorer verification passes;
- the score is below DANGER; and
- `PRODUCTION_TRADING_ENABLED=true`.

A launch row additionally requires a factory pool, no pool block, and the on-chain policy checks. Scanner failure or explorer/RPC unavailability blocks the UI execution verdict.

## What the scanner does not authorize

- It cannot register a token.
- It cannot deploy a pool.
- It cannot relay or sign a transaction.
- It cannot make an arbitrary token tradable.
- It cannot override an on-chain pause, block, eligibility decision, code mismatch, or oracle failure.

## Required production additions

- Continuous code-hash and proxy-implementation monitoring.
- Independent canonical-address ingestion with signed change records.
- Multiple RPC and explorer sources with disagreement alerts.
- Transaction simulation against the exact wallet, amount, and current block.
- Wallet-risk/sanctions screening supplied by a legally approved provider.
- Alerting for ownership changes, upgrades, unusual mint/burn/transfer patterns, liquidity concentration, and abrupt reserve changes.
- Human review and documented exceptions. Never silently downgrade a DANGER/BLOCKED result.
