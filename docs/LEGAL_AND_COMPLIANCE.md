# Legal and compliance boundary

This repository is engineering material, not legal advice and not a determination that operating a Coin/Stock Token liquidity pool is lawful.

The protocol composes existing ERC-20 stock-token contracts. It does not issue, redeem, custody, bridge, or establish ownership of an underlying share. Tokenized securities/RWA products can carry issuer, geographic, person-type, transfer, marketing, and secondary-trading restrictions. Permissionless settlement does not remove those obligations.

## Eligibility boundary

`IEligibilityGate` can be enforced for launches, swaps, additions, ordinary removals, and recipients. During a protocol/asset incident, LP removal may bypass a failed gate only when funds return to the same LP wallet; this is a narrow anti-lockout path, not permission to route assets to another party.

The gate is intentionally provider-neutral. Counsel and compliance owners must approve:

- eligible person types and jurisdictions under applicable law;
- KYC/KYB, AML, sanctions, wallet-risk, accreditation/sophistication, and transfer restrictions;
- smart-contract wallet and delegated-account treatment;
- decision evidence, expiry, revocation, appeal, false-positive handling, and support;
- privacy, minimization, retention, cross-border processing, security, and breach response;
- disclosures, suitability/appropriateness, marketing, tax, recordkeeping, surveillance, and reporting; and
- whether the operator or contributors trigger exchange/ATS/MTF, broker-dealer, securities, commodities, payments, custody, or consumer obligations.

Do not hard-code nationality, ethnicity, language, or broad regional stereotypes. Sanctions and jurisdiction decisions must rely on objective, current, legally approved data and procedures. IP/VPN/proxy signals may support risk review but should not be treated as conclusive identity or nationality evidence.

`complianceEnforced=false` is for isolated local testing only. The supplied shared-environment deployment process requires a nonzero gate. No mainnet broadcast path is supplied.
