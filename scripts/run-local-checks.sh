#!/usr/bin/env bash
set -euo pipefail
npm test
if command -v forge >/dev/null; then
  forge fmt --check
  forge build --sizes
  forge test -vvv
else
  echo "NOTICE: forge not installed; Solidity compilation/fuzz tests skipped locally. CI runs them." >&2
fi
