#!/usr/bin/env bash
set -euo pipefail

command -v cast >/dev/null || { echo "cast is required" >&2; exit 1; }
account_name=${1:-robinhood-launchpad-deployer}
echo "Foundry will prompt for the private key and a new keystore password. Neither is written to this repository."
cast wallet import "$account_name" --interactive
echo "Imported encrypted account: $account_name"
