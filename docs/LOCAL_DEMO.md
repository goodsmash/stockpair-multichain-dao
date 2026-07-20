# Local demo

## Start

```bash
npm install
npm --prefix apps/web install
npm run demo
```

Services:

- EVM RPC: `http://127.0.0.1:8545`
- Indexer: `http://127.0.0.1:8787`
- UI: `http://127.0.0.1:5173`

The script compiles contracts, starts an in-memory Shanghai-compatible chain, deploys mocks and the launchpad, configures eligibility and a mock stock/feed, creates a seeded market, writes temporary local public deployment configuration, and starts the API/UI.

## Wallet

Use the displayed unlocked local account through a development wallet connected to chain ID `31337`. The demo does not print or persist its private key. To fund another local wallet:

```bash
npm run demo:fund -- 0xYOUR_LOCAL_WALLET
```

## Exercise

1. Discover the seeded market.
2. Open the market and review scanner/code/lock state.
3. Swap in both directions.
4. Add and remove liquidity.
5. Scan the mock stock contract.
6. Review activity and portfolio.
7. Use the operations view with the appropriate local owner/guardian account.

## Cleanup

Stop the process with Ctrl+C. `apps/web/.env.local` and `deployments/local.json` are temporary and excluded from release packages.
