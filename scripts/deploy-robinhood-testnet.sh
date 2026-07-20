#!/usr/bin/env bash
set -euo pipefail

command -v forge >/dev/null || { echo "forge is required" >&2; exit 1; }
command -v cast >/dev/null || { echo "cast is required" >&2; exit 1; }

: "${RH_TESTNET_RPC_URL:?set RH_TESTNET_RPC_URL to a dedicated Robinhood Chain testnet endpoint}"
: "${DEPLOYER_ADDRESS:?set DEPLOYER_ADDRESS}"
: "${OWNER_ADDRESS:?set OWNER_ADDRESS}"
: "${GUARDIAN_ADDRESS:?set GUARDIAN_ADDRESS}"
: "${ELIGIBILITY_GATE_ADDRESS:?set ELIGIBILITY_GATE_ADDRESS}"
: "${STOCK_TOKEN_ADDRESS:?set STOCK_TOKEN_ADDRESS}"
: "${STOCK_PRICE_FEED_ADDRESS:?set STOCK_PRICE_FEED_ADDRESS}"
: "${STOCK_TICKER_BYTES32:?set STOCK_TICKER_BYTES32}"
: "${MIN_INITIAL_STOCK_VALUE_USD18:?set MIN_INITIAL_STOCK_VALUE_USD18}"

if [[ -n "${PRIVATE_KEY:-}" || -n "${MNEMONIC:-}" ]]; then
  echo "Refusing deployment: raw key material is set. Use an encrypted keystore, Ledger, HSM, or MPC signer." >&2
  exit 1
fi

chain_id=$(cast chain-id --rpc-url "$RH_TESTNET_RPC_URL")
if [[ "$chain_id" != "46630" ]]; then
  echo "Refusing deployment: expected Robinhood Chain testnet chain ID 46630, got $chain_id" >&2
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
  schedule)
    target="script/DeployRobinhoodTestnet.s.sol:DeployRobinhoodTestnet"
    ;;
  execute)
    : "${LAUNCHPAD_ADDRESS:?set LAUNCHPAD_ADDRESS for DEPLOY_PHASE=execute}"
    target="script/ExecuteRobinhoodTestnetSetup.s.sol:ExecuteRobinhoodTestnetSetup"
    ;;
  *)
    echo "DEPLOY_PHASE must be schedule or execute" >&2
    exit 1
    ;;
esac

forge script "$target" \
  --rpc-url "$RH_TESTNET_RPC_URL" \
  --sender "$DEPLOYER_ADDRESS" \
  "${signer_args[@]}" \
  --broadcast \
  --slow \
  -vvvv

if [[ "$phase" == "schedule" ]]; then
  echo "Phase 1 complete. Archive the broadcast JSON and emitted action calldata."
  echo "Do not run DEPLOY_PHASE=execute until StockCoinLaunchpad.ADMIN_DELAY (48 hours) has elapsed."
else
  echo "Phase 2 complete. If OWNER_ADDRESS differs from DEPLOYER_ADDRESS, the new owner must call acceptOwnership."
  echo "Run npm run verify:deployment with the exact expected code hash and protocol version before enabling any UI writes."
fi
