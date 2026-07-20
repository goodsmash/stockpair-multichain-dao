# UI and user flows

## Global states

The shell shows wallet state, network, factory trust, indexer stream and deployment posture. A red incident banner means direct on-chain trust or emergency controls block execution. An amber banner means indexer data is unavailable/mismatched/malformed; it must not become transaction authorization.

Every REST/SSE record is runtime-normalized before rendering. Invalid records are discarded or shown as unavailable. Explorer links are reconstructed from reviewed origins.

## Discover and Trade

1. Select an indexed factory launch.
2. Directly verify chain, factory hash/version, pool registration/factory/version/initialization/fee/pair, launch issuer/version/metadata, stock code/oracle and emergency state.
3. Enter exact input and review quote, price impact, fee, minimum output and 20-minute UI deadline.
4. Approve exactly the required amount, zeroing an existing allowance first.
5. Review network, target, function, sender, decoded arguments and protocol policy.
6. Sign in the wallet and confirm through a safe explorer URL.
7. Attempt residual allowance revocation.

The contract itself rejects deadlines over 30 minutes, swap minima looser than 3%, liquidity minima looser than 1%, swap input over 5% of reserve and non-self recipients.

## Liquidity

Addition uses proportional previews, exact approvals and minimum LP output. Removal uses minimum coin/stock outputs. Self-directed LP removal remains available under supported emergency/delisting paths; the browser must not substitute a third-party recipient.

## Launch

The wizard checks strict stock runtime/registry/source/oracle policy, supply allocation equality, creator cap, vesting, fee, LP custody and minimum oracle-denominated seed value. The launch contract enforces the deadline ceiling independently of the UI.

## Portfolio, Scout, Scanner and Activity

Portfolio reads balances only for verified factory markets. Scout presents bounded public on-chain evidence; same deployer/code/labels do not prove common ownership. Scanner findings inform risk policy but cannot create executable markets. Activity links use validated origins.

## Settings

Settings displays direct trust anchors, indexer claims, protocol identifiers, diagnostics and local privacy reset. Diagnostics must not include private keys, signatures, wallet secrets or credential-bearing URLs.
