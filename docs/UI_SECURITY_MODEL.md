# Browser and UI security model

## Data classes

1. **Direct RPC trust evidence:** chain ID, runtime code, protocol versions and contract reads. Required for write authorization.
2. **Indexer data:** convenience/aggregation only. It can degrade UI data but never authorize a spender or market.
3. **Wallet provider:** user-controlled transport. The UI still verifies chain and transaction intent before requesting signatures.
4. **Explorer links:** display-only. URLs are reconstructed from a reviewed origin and validated path component.

## Runtime normalization

All REST/SSE data is `unknown` until normalized. The browser accepts only:

- canonical 20-byte EVM addresses;
- canonical 32-byte hashes;
- bounded plain-text fields without control characters;
- bounded decimal/integer strings, not scientific notation;
- known risk enums;
- bounded arrays and evidence records; and
- valid local-development HTTP or production HTTPS explorer origins without credentials.

Malformed records are discarded or shown as unavailable. They do not flow into transaction construction.

## Write authorization

Before a write, `verifyFactory`, `verifyPool` and `authorizeWrite` prove the exact configured deployment. `verifyPool` checks registration, factory, protocol version, initialization, fee, coin/stock pair, launch record, issuer, launch-token version, metadata commitment, stock policy and emergency state. The recipient must equal the connected wallet.

Approvals must equal the required amount. Existing nonzero allowance is set to zero first. The interface attempts revocation after use, including failure paths.

## Failure presentation

- **Red incident banner:** direct on-chain trust mismatch, wrong chain, emergency control or execution lock. Wallet writes are disabled.
- **Amber data banner:** indexer unavailable/mismatched/malformed. Aggregated data may be incomplete; direct on-chain verification remains the write authority.

The two states must not be merged because doing so either hides real execution risk or unnecessarily makes an API authoritative.

## DOM and link rules

- Dynamic content is escaped before HTML/attribute insertion.
- No unvalidated URL is inserted into `href`.
- `target=_blank` links use `noopener noreferrer`.
- No seed/private-key import or signing service exists.
- CSP, frame denial, MIME/referrer/permissions/COOP/CORP and HSTS are configured for production.

## Required UI tests

Test normal, empty, loading, disconnected, malformed JSON, oversized JSON, invalid SSE, unavailable indexer, mismatched indexer, direct code/version mismatch, pause/block and mobile/desktop states. A UI redesign cannot bypass the security normalizers or write gate.
