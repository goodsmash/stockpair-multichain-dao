## Purpose

Describe the user-visible or security objective.

## Security impact

- [ ] No wallet write path changed
- [ ] Wallet write path changed and new regression tests are included
- [ ] No trust anchor, deployment, CSP, CORS, signer, oracle, registry or emergency-control change
- [ ] One or more of those controls changed and received independent review

## Verification

- [ ] `npm run setup`
- [ ] `npm run verify`
- [ ] Relevant isolated EVM scenarios
- [ ] `forge fmt --check && forge build --sizes && forge test -vvv`
- [ ] UI checked at desktop and mobile widths
- [ ] No secret, `.env.local`, deployment state or wallet material committed

## Deployment notes

List required environment changes, migration steps, monitoring and rollback instructions. “No deployment change” is acceptable.
