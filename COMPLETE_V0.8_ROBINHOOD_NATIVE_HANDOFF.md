# StockPair v0.8.0 Robinhood-native complete handoff

## Release identity

- Application/indexer/agent integration: **v0.8.0**
- Solidity protocol: **v0.6.0 unchanged**
- New SDK: `@stockpair/robinhood-chain-kit@0.8.0`
- Existing launch SDK updated to `@stockpair/launch-intelligence-sdk@0.8.0`

## Delivered native integration

v0.8 converts the official Robinhood Chain documentation into a dated machine-readable registry, read-only indexer endpoints, responsive UI, SDK/CLI, JSON Schemas, examples, tests and agent guides.

It includes network and protocol contracts, Arbitrum precompiles, ERC-8056 corporate actions, 24/5 oracle handling, sequencer recovery, staged finality, canonical retryables/Outbox/bridge plans, ERC-4337/EIP-7702 descriptors, Nitro gas behavior and node/upgrade posture.

## API

```text
GET /api/robinhood/capabilities
GET /api/robinhood/network
GET /api/robinhood/contracts
GET /api/robinhood/account-abstraction
GET /api/robinhood/gas
GET /api/robinhood/finality?transactionHash=0x...
GET /api/robinhood/stock-token/:address?feed=0x...&sequencerFeed=0x...&heartbeatSeconds=3600&gracePeriodSeconds=3600
GET /api/robinhood/messaging-plan?direction=l1-to-l2&target=0x...&data=0x
GET /api/robinhood/bridge-plan?direction=l2-to-l1&token=0x...
GET /api/robinhood/node
```

Every endpoint is read-only or produces an unsigned plan. The service accepts no private key and has no signing/broadcast primitive.

## Stock-token rules

- Resolve canonical token identity from the current official Robinhood asset registry.
- Resolve the current feed and heartbeat from Chainlink's Robinhood feed registry.
- Do not infer canonical status from name/symbol.
- Do not apply `uiMultiplier` to the feed price a second time.
- Block execution review for stale/non-positive/incomplete answers, missing heartbeat, `oraclePaused`, sequencer downtime, unreadable feeds or an unelapsed recovery grace period.
- Use integer arithmetic for multiplier calculations.

## Cross-chain rules

- Use the Arbitrum SDK rather than hand-encoding retryables or proofs.
- Estimate retryable gas immediately before signing.
- Handle L1-contract address aliasing on L2.
- Monitor and manually redeem failed L2 retryable execution within its lifetime.
- Treat L2→L1 initiation and L1 Outbox execution as separate transactions with the challenge period between them.
- Resolve canonical L1/L2 token addresses through gateway routers.

## Account abstraction rules

- Default policy is disabled.
- An enabled policy requires target and selector allowlists, per-call and total value caps, future expiry and immediate revocation.
- Paymasters are a separate trust boundary and must be chain/sender/target/selector/spend/time/rate bound.
- No agent/indexer/browser key custody.

## Node and finality rules

- Soft sequencer confirmation is not Ethereum finality.
- The endpoint only marks high-value safety after conservative finalized-tag evidence.
- A seven-day withdrawal challenge is separate from ordinary transaction finality.
- Public shared RPC endpoints are not treated as production infrastructure.
- Node upgrades are never automatic; review the official notice, image digest, chain files and compatibility, then canary and test rollback.

## Agent entrypoint

Read `docs/AGENT_START_HERE_v0.8.md`, then `docs/ROBINHOOD_DOCS_COVERAGE_MATRIX.md`. Add capabilities through registry → schema/example → read-only endpoint/unsigned plan → SDK/CLI → hostile-input tests → OpenAPI/docs → full quick suite/local smoke.

## Verification

- 15/15 new Robinhood-native tests passed.
- 14/14 launch-intelligence tests passed.
- Seven UI/security/accessibility tests passed.
- Complete inherited quick suite passed, including 160,000 AMM/liquidity properties, 37 Solidity structure files, 53 static-audit source files, eight scanner regressions, live Scout deployment detection and three indexer perimeter tests.
- Production Vite/CSP build passed.
- Root and browser runtime dependency audits reported zero known vulnerabilities.
- Local health, six native API endpoints, SDK CLI and UI HTTP delivery passed.
- The local chain was correctly rejected as an unknown reviewed Robinhood network.

See `qa/V0.8.0_ROBINHOOD_NATIVE_VERIFICATION.json` for exact evidence and remaining gates.

## Not claimed

No Robinhood endorsement, mainnet/testnet deployment, real bridge/message execution, production feed-registry ingestion, live bundler/paymaster, full-node operation, independent audit, legal approval or guarantee against future vulnerabilities is claimed.
