# Robinhood stock-token and oracle integration

## Canonical identity

Do not trust a name or symbol. Resolve a token from Robinhood's current official asset registry and preserve the registry evidence in the review record. Resolve its price feed and heartbeat from Chainlink's current Robinhood feed registry. The repository's `config/robinhood-stock-feeds.example.json` is intentionally empty.

## ERC-8056 corporate actions

The snapshot endpoint reads the ERC-20 fields plus:

- `uiMultiplier()`
- `newUIMultiplier()`
- `effectiveAt()`
- `balanceOfUI(address)`
- `totalSupplyUI()`
- `oraclePaused()`

A pending multiplier change is reported when the new multiplier differs and its effective timestamp is in the future. Display and accounting logic must use integer arithmetic. The price feed is already multiplier-adjusted; multiplying it by `uiMultiplier` a second time is incorrect.

Reference calculations:

```text
shareEquivalentUnits = rawBalance * uiMultiplier / 1e18
underlyingSharePrice = feedPrice * 1e18 / uiMultiplier
```

## Execution blockers

The integration fails closed when any required evidence is absent or unsafe:

- token address is not canonical;
- feed or heartbeat is missing;
- answer is non-positive or incomplete;
- answer exceeds the heartbeat;
- `oraclePaused()` is true;
- sequencer uptime feed is missing/unreadable;
- sequencer is down;
- recovery grace period has not elapsed;
- `uiMultiplier()` is unreadable.

The snapshot is informational. It does not authorize a StockPair listing or trade; the StockPair factory's independent strict-asset and oracle policy still applies.
