# Robinhood mainnet deployment runbook

This repository contains guarded mainnet tooling, but this release was not deployed to Robinhood Chain mainnet and contains no funded account, production address or transaction claim.

## Mandatory prerequisites

- independent smart-contract, economic, frontend and infrastructure review;
- legal/compliance authorization for the intended product and jurisdictions;
- separate hardware-backed deployer, owner multisig and guardian roles;
- dedicated authenticated HTTPS Robinhood RPC or operated node;
- current official stock-token/feed/heartbeat evidence;
- incident-response rehearsal, monitoring and public release channel; and
- at least the configured minimum deployer balance.

Raw private-key environment variables are rejected. Use a Foundry encrypted keystore account or supported hardware wallet.

## Configuration

Copy `config/robinhood-mainnet-deployment.env.example` outside Git and replace every placeholder. The deployment script requires chain ID `4663`, rejects shared public RPC endpoints, rejects embedded RPC credentials, rejects duplicate roles and defaults to simulation.

## Simulation

```bash
set -a
source /secure/path/robinhood-mainnet-deployment.env
set +a
./scripts/deploy-robinhood-mainnet.sh
```

The default `DEPLOY_MODE=simulate` must complete before any broadcast request. Preserve the simulation logs, gas estimate, generated addresses, runtime hashes and verifier output.

## Broadcast boundary

Broadcast requires all independent approvals plus:

```dotenv
DEPLOY_MODE=broadcast
MAINNET_DEPLOYMENT_ACK=I_ACCEPT_MAINNET_DEPLOYMENT_AND_HAVE_INDEPENDENT_APPROVALS
```

The workflow is two phase:

1. deploy and schedule the reviewed configuration;
2. wait through the mandatory delay, independently verify every address/hash/role, then execute the scheduled configuration.

Do not collapse the delay, reuse a deterministic local key, or copy testnet addresses.

## Post-deployment verification

Record and independently verify:

- chain ID and transaction hashes;
- factory, child deployer, locker and vesting-vault addresses;
- runtime code hashes and protocol versions;
- owner, guardian, eligibility gate and pending actions;
- stock-token runtime hash, oracle/feed policy and sequencer feed;
- public frontend trust anchors;
- explorer/source-verification state; and
- a signed release manifest.

Only after these checks may the Vercel production environment be updated. Keep `VITE_ENABLE_OPERATIONS=false` on the public origin until the formal production gate is approved.

## Market creation

The first real market is a separate controlled change. Simulate launch, seed, swap, liquidity-add and self-directed liquidity removal with exact limits first. No such mainnet lifecycle is claimed in the v0.9 archive.
