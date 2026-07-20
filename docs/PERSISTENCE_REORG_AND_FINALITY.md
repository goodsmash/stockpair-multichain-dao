# Persistence, Reorg and Finality Plan

The v0.7 intelligence layer remains compatible with the current in-memory Scout, but production operation should add durable storage before real-value use.

## Required tables

- `chains`: chain configuration and trust anchors.
- `blocks`: number, hash, parent hash, timestamp and canonicality.
- `transactions`: hash, block hash, sender, recipient and status.
- `contracts`: address, creator, runtime hash and first-seen evidence.
- `tokens`: normalized token metadata and probe history.
- `launches`: source adapter, lifecycle stage and canonical market.
- `pools`: factory/manager, token pair, hook, fee and canonicality.
- `events`: raw decoded event plus source block/hash.
- `signals`: versioned signal calculations and evidence IDs.
- `alerts`: matched rules, delivery attempts and acknowledgement.
- `agent_runs`: read-only decision trace; never store private keys.

## Cursor discipline

- Persist last canonical block number and hash per chain.
- On startup, verify the stored hash before continuing.
- Rewind a configurable safety window when a mismatch occurs.
- Make event writes idempotent by `(chain_id, transaction_hash, log_index)`.
- Recompute candidates when an evidence row is orphaned.

## State labels

- `observed`: feed-only or pending.
- `confirmed`: included in a canonical block.
- `finalized`: passed the configured finality policy.
- `reorged`: previously observed evidence is no longer canonical.
- `invalidated`: source configuration or trust anchor changed.

## Retention

Keep raw evidence longer than derived scores. A score can always be recomputed; a missing block/log/response cannot. Encrypt operational backups and exclude wallet secrets entirely.
