#!/usr/bin/env bash
set -euo pipefail

command -v anvil >/dev/null || { echo "anvil is required" >&2; exit 1; }
command -v forge >/dev/null || { echo "forge is required" >&2; exit 1; }

RPC_URL=${RPC_URL:-http://127.0.0.1:8545}
OWNER_ADDRESS=${OWNER_ADDRESS:?set OWNER_ADDRESS to an Anvil account}
export OWNER_ADDRESS
export GUARDIAN_ADDRESS=${GUARDIAN_ADDRESS:-$OWNER_ADDRESS}

forge script script/DeployLocalStack.s.sol:DeployLocalStack \
  --rpc-url "$RPC_URL" \
  --sender "$OWNER_ADDRESS" \
  --unlocked \
  --broadcast \
  -vvvv
