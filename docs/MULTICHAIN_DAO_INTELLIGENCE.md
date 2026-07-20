# Multi-chain and DAO intelligence

StockPair can continuously index any explicitly configured EVM-compatible network. “All chains” is not a single RPC switch: every chain needs its own dependable HTTP archive endpoint, optional pending-transaction WebSocket endpoint, explorer configuration, initial block, confirmation policy, expected block time and stall threshold.

## Coverage model

For each enabled entry in `config/scout-chains.example.json`, Scout:

- advances a durable block checkpoint and rewinds on reorg evidence;
- discovers contract creations from block transactions and receipts;
- records calls to already indexed contracts;
- discovers configured V2/V3 factory pools and reads live reserves or liquidity;
- records swaps only from validated indexed pools;
- detects chain stalls, provider failures and confirmation lag;
- persists hot state and an append-only event journal when the configured paths use a durable volume.

A browser-only fallback scans at most the latest 100 blocks on the connected Robinhood network. It is resilience coverage, not a complete historical index. Complete old-contract discovery requires a hosted indexer that starts from the required historical block and remains online until it reaches the confirmed head.

A chain whose RPC no longer serves blocks can only be reported as stalled or offline. StockPair cannot recover unavailable chain history without a working archive, replica or independently retained dataset.

## DAO and governance classification

The DAO engine fingerprints governor, timelock, vote/delegation, access-control and multisig-treasury selectors. It then performs bounded read-only probes for values such as owner, timelock, governance token, Safe owners and threshold, voting parameters and minimum delay.

Dormancy scoring combines only observable evidence:

- deployment age;
- time since the last indexed call;
- post-deployment call count;
- native treasury balance;
- current observed pool liquidity.

The result can be `unknown`, `too-new`, `active-evidence`, `watch` or `dormant-candidate`. It does not establish legal abandonment, lost keys, beneficial ownership, recoverability, permission to take control, or a right to move treasury assets.

## Opportunity and execution boundary

The opportunity endpoint separates:

- `BUY_REVIEW`: token candidates that meet the configured evidence policy and have a live verified pool;
- `WAITING_FOR_EVIDENCE`: candidates blocked by missing or adverse evidence;
- `EXIT_REVIEW`: liquidity removal, major liquidity reduction or reorg evidence that requires direct-chain review.

All queues are advisory. `autoExecutionAllowed` is always false. The indexer has no signer and accepts no private key. Any supported trade must refresh direct state, validate chain-matched factory/router/runtime hashes, simulate exact calldata, enforce amount/slippage/confirmation limits and obtain an explicit wallet signature.

## Public wallet evidence

Wallet watches must be entered by an operator with a public evidence source. Labels are not private-identity inference and do not prove that an individual or organization currently controls an address.

## Production setup

1. Copy only the required chain rows and set `enabled: true`.
2. Replace example endpoints with authenticated dedicated archive-capable providers.
3. Set an explicit historical `startBlock` for each required chain.
4. Mount `SCOUT_STATE_FILE` and `SCOUT_EVENT_JOURNAL_FILE` on persistent storage.
5. Configure reviewed DEX factory addresses before treating a pool as verified.
6. Keep alert secrets in the host secret store, not in source or the browser.
7. Observe `/api/scout/chains` until every required chain is healthy and caught up.
8. Independently review scanner, economic, legal and operational behavior before real-value use.
