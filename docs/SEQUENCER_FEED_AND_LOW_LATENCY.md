# Sequencer Feed and Low-Latency Observation

## Robinhood Chain inputs

Robinhood Chain documents:

- provider WebSocket endpoints for standard JSON-RPC subscriptions;
- a public sequencer feed;
- a first-come, first-served ordering model;
- public RPC endpoints that are rate-limited and unsuitable for production high-throughput or latency-sensitive systems.

Production ingestion should use a dedicated authenticated provider and a redundant canonical RPC/archive provider.

## Recommended architecture

1. **Feed observer** receives low-latency sequencer messages or provider subscriptions.
2. **Provisional decoder** extracts contract creation, factory, pool and launch events.
3. **Deduplication layer** keys observations by chain, transaction hash and log index.
4. **Canonical reconciler** confirms the transaction in a block from the canonical RPC.
5. **Reorg manager** marks orphaned observations and reverses derived candidate state.
6. **Radar scorer** only promotes confirmed evidence.
7. **Execution gate** performs a fresh canonical read and simulation immediately before signing.

## Important boundary

A sequencer-feed observation is provisional. It must not independently authorize a trade, approval or notification claiming final launch state.

## Suggested latency metrics

- feed arrival to provisional decode;
- provisional decode to canonical inclusion;
- canonical inclusion to radar publication;
- radar publication to user review;
- signed submission to inclusion;
- source feed head versus canonical RPC head.
