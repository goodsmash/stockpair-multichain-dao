# StockPair integration pack

This directory is the machine-readable contract for agents and external read-only consumers.

## Start here

1. Review `openapi.json` and `schemas/`.
2. Use `packages/launch-intelligence-sdk/` or `examples/agent-radar.mjs` to read candidates.
3. Configure alert evaluation through `config/alert-rules.example.json`.
4. Add a source with `templates/source-adapter.template.mjs` and `docs/LAUNCH_SOURCE_ADAPTER_GUIDE.md`.
5. Use `schemas/unsigned-execution-plan.schema.json` only to prepare a user-reviewable plan. It explicitly forbids embedded keys and broadcasting.
6. Follow `agent-tasks.json` in priority order.

## Safety boundary

Discovery, scoring and alert evaluation do not authorize a transaction. The integration service must not hold private keys, front-run, sandwich, spam the sequencer, bypass allowlists/anti-bot controls or submit unlimited approvals. A separate user-facing wallet flow must refresh direct-chain state, simulate the exact call, enforce limits and request an explicit signature.
