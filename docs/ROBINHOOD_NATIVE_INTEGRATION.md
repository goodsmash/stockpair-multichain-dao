# Robinhood Chain native integration

## Purpose

StockPair v0.8 adds a read-only Robinhood-native integration layer around the unchanged StockPair Solidity protocol v0.6. The layer models Robinhood Chain as a custom Arbitrum Nitro chain rather than treating it as generic Ethereum.

The implementation covers:

- reviewed mainnet/testnet network profiles;
- L1/L2 protocol contracts and Arbitrum precompiles;
- ERC-8056 stock-token corporate-action state;
- 24/5 oracle, heartbeat, sequencer-uptime and recovery-grace checks;
- conservative transaction-finality classification;
- canonical L1→L2 retryable-ticket plans;
- canonical L2→L1 Outbox plans;
- canonical asset bridge routing metadata;
- ERC-4337 EntryPoint generations and EIP-7702 capability descriptors;
- bounded account/session policy generation;
- Nitro node, ArbOS and upgrade posture.

## Safety boundary

All `/api/robinhood/*` endpoints are read-only or produce unsigned plans. They do not accept private keys, create approvals, sign user operations, sponsor gas, or broadcast transactions. Any execution service must remain separate, re-read direct-chain state, simulate the exact calldata, show decoded effects, enforce spend/slippage/deadline caps, and require user-controlled authorization.

## Source authority

The pinned registry is `integrations/robinhood/registry.json`. It records the review date and links to official Robinhood Chain documentation. Revalidate every address and version before production deployment. Dynamic stock-token and Chainlink feed registries are deliberately not frozen into the repository.

Official sources:

- https://docs.robinhood.com/chain/
- https://docs.robinhood.com/chain/connecting/
- https://docs.robinhood.com/chain/stock-tokens/
- https://docs.robinhood.com/chain/building-with-stock-tokens/
- https://docs.robinhood.com/chain/protocol-contracts/
- https://docs.robinhood.com/chain/cross-chain-messaging/
- https://docs.robinhood.com/chain/account-abstraction/
- https://docs.robinhood.com/chain/oracles-and-price-feeds/
- https://docs.robinhood.com/chain/transaction-finality/
- https://docs.robinhood.com/chain/run-a-full-node/
- https://docs.robinhood.com/chain/notices-and-upgrades/
