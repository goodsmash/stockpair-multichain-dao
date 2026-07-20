# Agent Integration Cookbook

## Read-only client

Use the SDK in `packages/launch-intelligence-sdk`:

```js
import { StockPairLaunchIntelligenceClient } from '@stockpair/launch-intelligence-sdk'

const client = new StockPairLaunchIntelligenceClient({
  baseUrl: process.env.STOCKPAIR_INDEXER_URL
})

const radar = await client.getCandidates({
  chainId: 4663,
  minScore: 70,
  maxRiskScore: 20,
  limit: 25
})
```

## Agent decision rule

An agent may:

- summarize candidates;
- explain evidence and blockers;
- create watchlists;
- propose an unsigned execution plan;
- request an explicit human review;
- monitor a submitted transaction;
- generate incident evidence.

An agent must not:

- store or request a raw private key;
- silently sign or broadcast;
- widen slippage or deadlines;
- substitute a spender, router, pool or recipient;
- bypass an allowlist or anti-bot mechanism;
- treat a source score as proof of safety.

## Alert rules

Copy `config/alert-rules.example.json` and validate it against `integrations/schemas/alert-rule.schema.json`.

## Execution policies

Copy `config/execution-policy.example.json`. The default mode is `review-only` and disabled. Session-key mode requires a non-zero daily cap and should additionally enforce contract/function allowlists, short expiry and revocation.

## API contract

`integrations/openapi.json` documents the read-only endpoints. The server exposes:

- `GET /api/radar/sources`
- `GET /api/radar/candidates`
- `GET /api/radar/alerts`
- existing Scout and SSE endpoints

## Adding a source

1. Add a descriptor and chain-specific configuration.
2. Verify official addresses and event signatures.
3. Add fixture blocks/logs.
4. Add normal, malformed, malicious and reorg tests.
5. Update the source matrix and evidence references.
6. Keep execution trust separate from discovery.
