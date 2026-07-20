# @stockpair/robinhood-chain-kit

Read-only SDK and CLI for StockPair's Robinhood-native indexer endpoints.

## Included

- reviewed network and protocol-contract metadata;
- ERC-8056 stock-token snapshots;
- corporate-action multiplier helpers;
- Chainlink heartbeat, sequencer and `oraclePaused` assessment;
- conservative finalized-tag transaction status;
- unsigned L1→L2 retryable and L2→L1 Outbox plans;
- canonical asset-bridge routing plans;
- ERC-4337/EIP-7702 capability descriptors;
- gas, Nitro node, ArbOS and upgrade posture.

The package never accepts a private key, signs, approves, sponsors or broadcasts. Remote base URLs must use HTTPS; loopback HTTP is allowed only for local development. Responses are content-type, content-length and body-size bounded and must advertise the exact expected `X-StockPair-API-Version` (default `0.9.0`).

```js
import {
  RobinhoodChainKitClient,
  assessOracleSnapshot,
  scaleRawToShares,
  deriveUnderlyingSharePrice
} from '@stockpair/robinhood-chain-kit'

const client = new RobinhoodChainKitClient({ baseUrl: 'https://indexer.example.com' })
const network = await client.getNetwork()
const snapshot = await client.getStockTokenSnapshot('0x...', {
  feed: '0x...',
  sequencerFeed: '0x...',
  heartbeatSeconds: 3600,
  gracePeriodSeconds: 3600
})
```

## CLI

```bash
stockpair-robinhood capabilities --base-url https://indexer.example.com --api-version 0.9.0
stockpair-robinhood network --base-url https://indexer.example.com
stockpair-robinhood contracts --base-url https://indexer.example.com
stockpair-robinhood aa --base-url https://indexer.example.com
stockpair-robinhood gas --base-url https://indexer.example.com
stockpair-robinhood node --base-url https://indexer.example.com
stockpair-robinhood finality --base-url https://indexer.example.com --tx 0x...
stockpair-robinhood stock-token --base-url https://indexer.example.com --token 0x... --feed 0x... --sequencer-feed 0x... --heartbeat 3600 --grace 3600
stockpair-robinhood message-plan --base-url https://indexer.example.com --direction l1-to-l2 --target 0x... --data 0x
stockpair-robinhood bridge-plan --base-url https://indexer.example.com --direction l2-to-l1 --token 0x...
```

Production callers must independently authenticate the indexer origin and revalidate dynamic official token/feed registries. Returned plans are not transaction authorization.
