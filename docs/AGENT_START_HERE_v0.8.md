# Agent start here — v0.8 Robinhood native

## First commands

```bash
npm ci
npm ci --prefix apps/web
npm run test:robinhood
npm run test:quick
npm run local
```

## Read first

1. `SECURITY.md`
2. `docs/ROBINHOOD_NATIVE_INTEGRATION.md`
3. `docs/ROBINHOOD_DOCS_COVERAGE_MATRIX.md`
4. `integrations/robinhood/registry.json`
5. `services/indexer/src/robinhood/native-integration.mjs`
6. `packages/robinhood-chain-kit/README.md`
7. `integrations/openapi.json`

## Adding a native capability

1. Cite an official Robinhood or upstream Arbitrum/Chainlink source.
2. Add a reviewed registry field or explicit runtime input; do not guess addresses.
3. Add a JSON Schema and bounded example.
4. Implement a read-only endpoint or unsigned-plan generator.
5. Add SDK/CLI support without key/sign/broadcast methods.
6. Runtime-normalize every API value before UI insertion.
7. Add positive, invalid, missing-evidence and hostile-input tests.
8. Update OpenAPI, coverage matrix, release notes and agent handoff.
9. Run the complete quick suite and local smoke.

## Prohibited shortcuts

- no private keys, seeds or raw signer RPC in indexer/agent code;
- no autonomous buy/snipe path;
- no front-running, sandwiching, sequencer spam or anti-bot bypass;
- no hard-coded dynamic stock-token/feed list;
- no assumption that soft confirmation equals Ethereum finality;
- no assumption that L2→L1 initiation equals completion;
- no automatic node upgrade;
- no production use of shared public RPC.

## Machine-readable continuation files

- `integrations/robinhood/agent-tasks.json` — prioritized implementation backlog and acceptance gates.
- `integrations/robinhood/templates/capability-adapter.template.mjs` — safe adapter skeleton.
- `integrations/robinhood/examples/native-agent.mjs` — runnable read-only health/review example.
