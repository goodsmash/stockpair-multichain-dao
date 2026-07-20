#!/usr/bin/env bash
set -euo pipefail

command -v forge >/dev/null || { echo "forge is required" >&2; exit 1; }
command -v cast >/dev/null || { echo "cast is required" >&2; exit 1; }

: "${RH_MAINNET_RPC_URL:?set RH_MAINNET_RPC_URL to a dedicated authenticated Robinhood Chain mainnet endpoint}"
: "${DEPLOYER_ADDRESS:?set DEPLOYER_ADDRESS}"
: "${OWNER_ADDRESS:?set OWNER_ADDRESS}"
: "${GUARDIAN_ADDRESS:?set GUARDIAN_ADDRESS}"
: "${ELIGIBILITY_GATE_ADDRESS:?set ELIGIBILITY_GATE_ADDRESS}"
: "${STOCK_TOKEN_ADDRESS:?set STOCK_TOKEN_ADDRESS from a current reviewed official registry}"
: "${STOCK_PRICE_FEED_ADDRESS:?set STOCK_PRICE_FEED_ADDRESS from a current reviewed official registry}"
: "${STOCK_TICKER_BYTES32:?set STOCK_TICKER_BYTES32}"
: "${MIN_INITIAL_STOCK_VALUE_USD18:?set MIN_INITIAL_STOCK_VALUE_USD18}"

if [[ -n "${PRIVATE_KEY:-}" || -n "${MNEMONIC:-}" || -n "${SEED_PHRASE:-}" ]]; then
  echo "Refusing deployment: raw key material is set. Use an encrypted Foundry account, Ledger, HSM, or MPC signer." >&2
  exit 1
fi
if [[ "$DEPLOYER_ADDRESS" == "$OWNER_ADDRESS" || "$DEPLOYER_ADDRESS" == "$GUARDIAN_ADDRESS" || "$OWNER_ADDRESS" == "$GUARDIAN_ADDRESS" ]]; then
  echo "Refusing deployment: deployer, owner multisig, and guardian must be distinct." >&2
  exit 1
fi

node -e 'const u=new URL(process.argv[1]); if(u.protocol!=="https:"||u.username||u.password||u.hash) process.exit(1); if(["rpc.mainnet.chain.robinhood.com","rpc.testnet.chain.robinhood.com"].includes(u.hostname)) process.exit(2)' "$RH_MAINNET_RPC_URL" || {
  code=$?
  if [[ "$code" == "2" ]]; then echo "Refusing deployment: use a dedicated authenticated RPC, not the public shared endpoint." >&2; else echo "Refusing deployment: RH_MAINNET_RPC_URL must be credential-free HTTPS without a fragment." >&2; fi
  exit 1
}

chain_id=$(cast chain-id --rpc-url "$RH_MAINNET_RPC_URL")
if [[ "$chain_id" != "4663" ]]; then
  echo "Refusing deployment: expected Robinhood Chain mainnet chain ID 4663, got $chain_id" >&2
  exit 1
fi

minimum_balance="${MIN_DEPLOYER_BALANCE_WEI:-50000000000000000}"
balance=$(cast balance "$DEPLOYER_ADDRESS" --rpc-url "$RH_MAINNET_RPC_URL")
if ! [[ "$minimum_balance" =~ ^[0-9]+$ && "$balance" =~ ^[0-9]+$ ]] || (( balance < minimum_balance )); then
  echo "Refusing deployment: deployer balance $balance wei is below required $minimum_balance wei." >&2
  exit 1
fi

signer_args=()
if [[ -n "${DEPLOYER_ACCOUNT:-}" ]]; then
  signer_args+=(--account "$DEPLOYER_ACCOUNT")
elif [[ "${USE_LEDGER:-0}" == "1" ]]; then
  signer_args+=(--ledger)
else
  echo "Set DEPLOYER_ACCOUNT to an encrypted Foundry keystore name or USE_LEDGER=1." >&2
  exit 1
fi

phase="${DEPLOY_PHASE:-schedule}"
case "$phase" in
  schedule) target="script/DeployRobinhoodMainnet.s.sol:DeployRobinhoodMainnet" ;;
  execute)
    : "${LAUNCHPAD_ADDRESS:?set LAUNCHPAD_ADDRESS for DEPLOY_PHASE=execute}"
    target="script/ExecuteRobinhoodMainnetSetup.s.sol:ExecuteRobinhoodMainnetSetup"
    ;;
  *) echo "DEPLOY_PHASE must be schedule or execute" >&2; exit 1 ;;
esac

mode="${DEPLOY_MODE:-simulate}"
forge_args=(script "$target" --rpc-url "$RH_MAINNET_RPC_URL" --sender "$DEPLOYER_ADDRESS" "${signer_args[@]}" --slow -vvvv)
case "$mode" in
  simulate) echo "Running a non-broadcast mainnet simulation." ;;
  broadcast)
    if [[ "${MAINNET_DEPLOYMENT_ACK:-}" != "I_ACCEPT_MAINNET_DEPLOYMENT_AND_HAVE_INDEPENDENT_APPROVALS" ]]; then
      echo "Refusing broadcast: exact MAINNET_DEPLOYMENT_ACK is required." >&2
      exit 1
    fi
    forge_args+=(--broadcast)
    ;;
  *) echo "DEPLOY_MODE must be simulate or broadcast" >&2; exit 1 ;;
esac

forge "${forge_args[@]}"

if [[ "$mode" == "simulate" ]]; then
  echo "Simulation completed. No transaction was broadcast. Review calldata, roles, stock/feed provenance, code hashes and gas." 
elif [[ "$phase" == "schedule" ]]; then
  echo "Phase 1 broadcast completed. Archive broadcast JSON, action IDs and exact calldata. Wait at least ADMIN_DELAY before phase 2."
else
  echo "Phase 2 broadcast completed. OWNER_ADDRESS must accept ownership before production enablement. Run independent deployment verification."
fi
