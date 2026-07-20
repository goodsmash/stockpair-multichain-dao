# Robinhood documentation coverage matrix

| Official topic | v0.8 implementation | Primary files | Remaining production gate |
|---|---|---|---|
| About / EVM / sequencing | network profile and FCFS semantics | `registry.json`, native UI | target-chain load and failure testing |
| Connecting | mainnet/testnet endpoints and shared-RPC warning | registry, `/network` | dedicated authenticated provider/node |
| Stock Tokens | canonical-address rule and 18-decimal/ERC-8056 model | stock-token guide/schema | live official registry ingestion |
| Building with Stock Tokens | multiplier functions and integer-safe SDK helpers | chain kit, snapshot endpoint | canonical token conformance tests |
| Differences from Ethereum | L1 block estimate, ArbSys, aliasing, no prevrandao randomness | guides and plans | contract-specific alias tests |
| Gas & Fees | L2/L1 data components and live gas endpoint | `/gas` | production fee telemetry |
| Transaction Finality | staged model and finalized-tag lookup | `/finality` | batch-posting proof adapter |
| Token Contracts | reviewed WETH/USDG and dynamic registry boundary | registry | signed/monitored token-registry mirror |
| Protocol Contracts | L1/L2 contracts and precompiles | `/contracts` | pre-deploy bytecode/hash revalidation |
| Deploy a Contract | unchanged deterministic deployment workflow | deploy scripts/docs | Robinhood testnet deployment rehearsal |
| Account Abstraction | EntryPoints, EIP-7702 and bounded policy schema | `/account-abstraction`, AA guide | bundler/paymaster simulation service |
| Cross-Chain Messaging | retryable/ArbSys/Outbox unsigned plans | `/messaging-plan` | two-chain integration tests |
| Oracles & Price Feeds | heartbeat, sequencer, grace and `oraclePaused` | stock snapshot | current feed registry ingestion |
| Run a full node | Nitro/ArbOS/resources/feed posture | `/node` | real node smoke and alerting |
| Governance | reviewed operational boundary; no public admin UI | security/operations docs | multisig/timelock procedures |
| Notices & Upgrades | manual-review node policy | node schema/guide | automated notice ingestion with human approval |
| Terms | risk/non-affiliation and no-advice boundaries | README, handoffs | counsel review |

“Implemented” means source and tests exist. It does not mean Robinhood endorsement, legal approval, production authorization or completion of the remaining gate.
