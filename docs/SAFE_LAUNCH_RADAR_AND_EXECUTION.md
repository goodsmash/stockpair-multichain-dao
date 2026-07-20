# Safe Launch Radar and Guarded Execution

## Terminology

The product uses **Launch Radar** and **fast launch review**, not an unrestricted sniper bot. The supported goal is to detect newly deployed assets quickly, assess evidence, simulate a transaction and let the user authorize a bounded action.

The system must not implement:

- sandwich attacks;
- transaction insertion intended to front-run another user;
- bypasses for anti-bot, allowlist or per-wallet restrictions;
- stolen/private mempool access;
- spam transactions intended to monopolize sequencer ordering;
- hidden private-key storage;
- automatic trading with unlimited approvals or unlimited spend.

## Required execution pipeline

1. Observe a candidate from a configured source.
2. Wait for the configured canonicality level.
3. Refresh token, pool, factory, hook, oracle and emergency state directly from the chain.
4. Resolve the canonical pool or launch source from an allowlisted registry.
5. Run static bytecode and privilege analysis.
6. Run exact buy and exact sell simulations against the intended block state.
7. Calculate minimum output, price impact, fees, taxes and maximum loss.
8. Apply policy limits for risk, liquidity, position size, daily spend, slippage and age.
9. Present a decoded transaction review with spender, recipient and state assumptions.
10. Request an explicit wallet signature or a narrowly scoped session-key signature.
11. Confirm inclusion and compare actual execution with the reviewed plan.
12. Revoke any remaining allowance and record evidence.

## Fast paths that remain safe

- Precompute read-only candidate scores.
- Prebuild unsigned calldata after a canonical launch event.
- Cache reviewed factory and hook code hashes.
- Use a dedicated WebSocket and sequencer-feed observer.
- Use ERC-4337 batching for approval + swap + residual-approval cleanup.
- Use session keys with contract/function allowlists, low caps and short expiration.
- Use private transaction submission only for protection from public-orderflow leakage, not to manipulate other users.

## Fail-closed conditions

Execution must remain blocked when:

- chain ID, factory address, factory hash or protocol version differs;
- a pool is not registered by the reviewed source;
- a v4 hook is unapproved or changed;
- simulation fails or buy/sell behavior differs materially;
- the quote cannot account for taxes or dynamic fees;
- source data and direct-chain state disagree;
- the asset or pool is paused, blocked, delisted or stale;
- the requested deadline, slippage or position size exceeds policy;
- a reorg invalidates the launch or pool event;
- the user has not explicitly approved the exact plan.
