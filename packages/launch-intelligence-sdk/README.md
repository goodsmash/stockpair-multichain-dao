# StockPair Launch Intelligence SDK

Read-only SDK and CLI for launch discovery, ranking, alert evaluation and SSE consumption.

The package never stores keys, signs transactions or broadcasts calls. A trading client must independently refresh direct-chain state, simulate the exact call, apply the execution policy and request an explicit wallet signature.

## SDK

```js
import { StockPairLaunchIntelligenceClient } from '@stockpair/launch-intelligence-sdk'

const client = new StockPairLaunchIntelligenceClient({ baseUrl: 'https://indexer.example.com' })
const radar = await client.getCandidates({ chainId: 4663, minScore: 70, maxRiskScore: 20 })
```

Remote URLs must use HTTPS. Plain HTTP is allowed only for loopback development. Every JSON response must advertise the exact `X-StockPair-API-Version` expected by the client (default `0.9.0`). SSE subscription is unavailable until a verified REST request succeeds.

## CLI

```bash
stockpair-radar sources --base-url https://indexer.example.com --api-version 0.9.0
stockpair-radar candidates --base-url https://indexer.example.com --chain-id 4663 --min-score 70 --max-risk-score 20
stockpair-radar alerts --base-url http://127.0.0.1:8787 --limit 20
```

The CLI is one-shot and read-only. It emits JSON to stdout for piping into an agent, scheduler or evidence archive.
