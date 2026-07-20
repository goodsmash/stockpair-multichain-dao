# External DEX execution

StockPair v0.9 supports user-authorized V2- and V3-style external DEX routes. It does not trust an arbitrary router address and it does not automatically sign or broadcast.

## Enabling an adapter

Configure `VITE_DEX_ADAPTERS_JSON` from a reviewed copy of `config/dex-adapters.example.json`. Every enabled adapter must match the browser chain and contain nonzero runtime-code hashes for:

- factory;
- router;
- wrapped native token;
- expected pair or pool implementation; and
- V3 quoter, when applicable.

An adapter with a missing, zero, malformed or chain-mismatched value is discarded. This means external trading is disabled by default.

## Quote and route verification

Before a quote or wallet request, the browser:

1. verifies the current chain;
2. verifies factory, router, wrapped-native and quoter runtime hashes;
3. resolves the pair/pool from the pinned factory;
4. verifies the resolved pair/pool runtime hash and token pair;
5. requests a quote;
6. calculates minimum received and price impact;
7. enforces the configured block-confirmation threshold, risk gate and browser buy cap;
8. refreshes the quote and route immediately before signature; and
9. displays decoded calldata and policy details for explicit wallet confirmation.

The maximum external-route slippage accepted by the browser is 500 basis points. New launches default to a higher reviewed tolerance than established assets, but the value remains visible and bounded. Price impact above the browser policy is rejected.

## Allowances

Token sales use an exact allowance. A nonzero incompatible allowance is first reset to zero. Residual allowance revocation is attempted after success or failure. Native-token buys do not require an ERC-20 allowance.

## Quick Buy

Quick Buy is a shortened review path, not an autonomous sniper. The default amount is `0.001 ETH`; the user can set a smaller or larger amount subject to a separate maximum-buy cap. The button remains disabled until the configured number of block confirmations is observed and the candidate passes the browser risk gate.

Quick Buy never stores a key, signs automatically, front-runs, sandwiches, bypasses an anti-bot rule or submits repeated spam transactions. The connected wallet always presents the final signature request.

## Remaining production work

Canonical factory/router/quoter addresses and runtime hashes must be independently reviewed for the target Robinhood deployment. No external DEX adapter is claimed to be production-enabled in this source archive.
