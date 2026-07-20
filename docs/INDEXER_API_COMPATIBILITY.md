# Indexer API compatibility and substitution defense

Every REST response includes:

```text
X-StockPair-API-Version: 0.9.0
```

The browser, Launch Intelligence SDK and Robinhood Chain Kit require an exact match. A missing or different value is a hard compatibility failure, not a warning.

## REST rules

- JSON endpoints must return `application/json`.
- SDK responses are limited to 2 MB.
- Invalid JSON, unexpected content type and oversized responses are rejected.
- Host and Origin must match configured allowlists.
- Only GET and OPTIONS are accepted.
- Query values, addresses, hashes and calldata are bounded and parsed before RPC access.

## SSE rules

The browser ignores SSE until a compatible REST response succeeds. The Launch Intelligence SDK refuses subscription before a verified REST request. Event payloads are bounded and malformed JSON is ignored. Global and per-client connection limits and slow-consumer removal are enforced server-side.

## Upgrade procedure

An API version change requires coordinated updates to:

- `services/indexer/src/server.mjs`
- `apps/web/src/main.ts`
- both SDK constructors/defaults
- OpenAPI response headers
- runtime tests
- deployment docs and release notes

Do not silently accept multiple major/minor versions. Publish a migration release instead.
