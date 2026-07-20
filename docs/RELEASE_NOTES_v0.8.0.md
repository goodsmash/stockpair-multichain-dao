# StockPair v0.8.0 release notes

v0.8 is the Robinhood-native application, indexer and agent-integration release. The Solidity protocol remains v0.6.0 and no contract bytecode was changed.

Added:

- reviewed Robinhood mainnet/testnet registry;
- protocol-contract, precompile and core-token metadata;
- ERC-8056 stock-token and corporate-action snapshots;
- fail-closed Chainlink/heartbeat/sequencer/oracle-pause assessment;
- conservative transaction finality endpoint;
- gas/Nitro semantics endpoint;
- unsigned retryable-ticket, Outbox and canonical-bridge plans;
- ERC-4337/EIP-7702 descriptors and bounded AA policy schema;
- Nitro node/ArbOS/upgrade posture;
- read-only `@stockpair/robinhood-chain-kit` SDK and CLI;
- OpenAPI routes, JSON Schemas, examples and documentation coverage matrix;
- responsive Robinhood Native UI console.

No live Robinhood deployment, real bridge transaction, production stock-token feed registry, bundler/paymaster integration or full-node operation is claimed.
