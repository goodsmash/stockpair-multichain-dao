# Chain Scout architecture and evidence policy

Chain Scout is a read-only intelligence subsystem for Robinhood Chain and operator-configured EVM networks. It does not sign, relay, simulate a successful sale, list arbitrary tokens, or bypass the launchpad execution gate.

## What it indexes

For every configured block range, the service:

1. reads each block with full transaction objects;
2. detects top-level contract creation transactions (`to == null`);
3. obtains the deployment receipt and runtime bytecode;
4. probes the deployed address for common ERC-20 metadata;
5. runs local static bytecode-risk heuristics;
6. records deployer, code hash, block, transaction, and public-label evidence;
7. detects common Uniswap V2/V3 pool-creation and swap event signatures; and
8. publishes bounded in-memory records through REST and Server-Sent Events.

A dedicated archive/indexing provider is required for complete historical coverage. The public Robinhood Chain RPC is rate-limited and is not intended for production indexing.

## Cross-chain configuration

`SCOUT_CHAINS_FILE` or `SCOUT_CHAINS_JSON` supplies the exact chains to index. No generic URL is accepted from a browser request. Every upstream endpoint is operator configured at process start.

Example:

```json
[
  {
    "chainId": 4663,
    "name": "Robinhood Chain",
    "rpcUrl": "https://robinhood-mainnet.g.alchemy.com/v2/REPLACE_IN_SECRET_MANAGER",
    "explorerUrl": "https://robinhoodchain.blockscout.com",
    "wsUrl": "wss://robinhood-mainnet.g.alchemy.com/v2/REPLACE_IN_SECRET_MANAGER"
  }
]
```

Do not commit provider keys. Mount the final file from a secret manager or render it at deployment time.

## Attribution and known-builder evidence

The system does not infer a private identity. A connection is displayed only with an evidence type:

- exact public address label;
- same deploying address;
- exact runtime-code hash reuse;
- configured factory relationship; or
- a public source explicitly supplied in the label registry.

A shared funder, similar name, timing correlation, IP address, nationality, language, or geographic stereotype is not treated as identity evidence.

`config/scout-labels.example.json` documents the label schema. Production labels require review and a durable public source.

## Pool and swap confidence

A matching event signature alone is not an endorsement. Pool rows are marked `verifiedFactory` only when the emitting factory address is present in `SCOUT_DEX_FACTORIES_JSON`. Unknown factories stay visible as unverified intelligence.

No USD volume, market capitalization, candle, or price is invented. Swap rows show only raw on-chain event values unless an independently configured price source is added later.

## Live feed

`GET /api/stream` uses Server-Sent Events and emits:

- `contract-created`;
- `token-detected`;
- `pool-created`; and
- `swap-observed`.

The browser watchlist is stored locally and is not sent to the server. It can alert on watched pools/tokens while the page is open.

## Security boundaries

- The scout has no private key, wallet, transaction method, or mutable listing endpoint.
- Browser clients cannot choose RPC/explorer URLs.
- API responses use no-store, CSP, clickjacking, MIME, referrer, permissions, COOP, and CORP headers.
- CORS is an exact allowlist; wildcard origins are rejected at startup.
- Result arrays, request length, query limits, cache size, rate-limit state, and polling ranges are bounded.
- Scanner and scout verdicts are advisory. Tradability still requires a factory-created pool, approved stock token, matching runtime hash, oracle health, eligibility, and no active emergency state.

## Production additions still required

- durable event database with finality/reorg handling;
- redundant archive RPC and explorer/index sources;
- canonical DEX factory registry and verified ABI catalog;
- WebSocket/pending transaction provider where permitted;
- metrics, tracing, queue lag and block-gap alerts;
- reviewed public-label change process;
- sanctions/KYC provider integration at the eligibility boundary;
- independent contract and application security audits; and
- legal approval for securities/RWA distribution and market operation.
