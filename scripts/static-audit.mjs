import fs from 'node:fs'
import path from 'node:path'

const roots = ['src', 'script', 'test', 'apps/web/src', 'services/indexer/src']
const forbidden = [
  ['tx.origin', /\btx\.origin\b/],
  ['runtime delegatecall', /(?:\.delegatecall\s*\(|\bdelegatecall\s*\()/],
  ['selfdestruct execution', /\bselfdestruct\s*\(/],
  ['block-number timing', /\bblock\.number\b/],
  ['prevrandao randomness', /\bblock\.prevrandao\b/],
  ['hard-coded private key', /\b(?:PRIVATE_KEY\s*=\s*0x[0-9a-fA-F]{64}|["']0x[0-9a-fA-F]{64}["'])\b/],
  ['raw secret logging', /console\.(?:log|error)\([^\n]*(?:private.?key|mnemonic|seed)/i]
]

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(file) : [file]
  })
}

const files = roots.flatMap((root) => fs.existsSync(root) ? walk(root) : [])
const failures = []
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8')
  for (const [name, pattern] of forbidden) {
    if (file.includes(`${path.sep}mocks${path.sep}`) && ['runtime delegatecall', 'selfdestruct execution'].includes(name)) continue
    if (pattern.test(text)) failures.push(`${file}: ${name}`)
  }
  if (file.startsWith(path.join('apps', 'web')) && text.includes('maxUint256')) failures.push(`${file}: frontend unlimited approval`)
}

const required = [
  ['src/StockCoinPool.sol', 'MAX_SWAP_INPUT_BPS'],
  ['src/StockCoinPool.sol', 'MAX_SWAP_SLIPPAGE_BPS = 300'],
  ['src/StockCoinPool.sol', 'MAX_LIQUIDITY_SLIPPAGE_BPS = 100'],
  ['src/StockCoinPool.sol', 'MAX_DEADLINE_WINDOW = 30 minutes'],
  ['src/StockCoinPool.sol', 'STOCKPAIR_POOL_V0.6.0'],
  ['src/StockCoinPool.sol', 'InvariantViolation'],
  ['src/StockCoinLaunchpad.sol', 'SelfRecipientRequired'],
  ['src/StockCoinLaunchpad.sol', 'ADMIN_DELAY'],
  ['src/StockCoinLaunchpad.sol', 'MAX_DEADLINE_WINDOW = 30 minutes'],
  ['src/StockCoinLaunchpad.sol', 'STOCKPAIR_LAUNCHPAD_V0.6.0'],
  ['src/StockCoinLaunchpad.sol', 'MIN_LIQUIDITY_LOCK_DURATION = 365 days'],
  ['src/StockCoinLaunchpad.sol', 'MAX_CREATOR_ALLOCATION_BPS = 1_000'],
  ['src/StockCoinLaunchpad.sol', 'CreatorVestingVault'],
  ['src/StockCoinLaunchpad.sol', 'BytecodePolicy.validateStrictAsset'],
  ['src/StockCoinLaunchpad.sol', 'minInitialStockValueUsd18'],
  ['src/StockCoinLaunchpad.sol', 'isTrustedPool'],
  ['src/LaunchToken.sol', 'STOCKPAIR_LAUNCH_TOKEN_V0.6.0'],
  ['src/AttestedEligibilityGate.sol', 'STOCKPAIR_ELIGIBILITY_GATE_V0.6.0'],
  ['src/AttestedEligibilityGate.sol', 'MAX_ELIGIBILITY_DURATION = 30 days'],
  ['src/AttestedEligibilityGate.sol', 'ADMIN_DELAY = 48 hours'],
  ['src/AttestedEligibilityGate.sol', 'cancelAdminAction'],
  ['src/utils/TwoStepAdmin.sol', 'pendingOwnerExpiresAt'],
  ['src/utils/TwoStepAdmin.sol', 'OWNERSHIP_ACCEPTANCE_WINDOW = 7 days'],
  ['scripts/deploy-robinhood-testnet.sh', 'Refusing deployment: raw key material is set'],
  ['scripts/deploy-robinhood-testnet.sh', 'DEPLOY_PHASE'],
  ['scripts/verify-deployment.mjs', 'protocolVersionMatches'],
  ['scripts/deploy-local-node.mjs', 'LOCAL_TRANSACTION_DEADLINE_SECONDS = 20n * 60n'],
  ['services/indexer/src/risk.mjs', 'strictAssetPolicy'],
  ['services/indexer/src/risk.mjs', 'hasProxyEvidence'],
  ['services/indexer/src/server.mjs', 'maxSseConnections'],
  ['services/indexer/src/server.mjs', 'trustedProxyIps'],
  ['services/indexer/src/server.mjs', "'cross-origin-resource-policy': 'cross-origin'"],
  ['services/indexer/src/server.mjs', 'removeStream'],
  ['services/indexer/src/server.mjs', 'writeStream'],
  ['services/indexer/src/config.mjs', 'LAUNCHPAD_CODE_HASH'],
  ['services/indexer/src/config.mjs', "LOCAL_DEMO_ACK is valid only for chain 31337 with loopback RPC and browser origins"],
  ['services/indexer/src/config.mjs', 'Production trading requires a dedicated authenticated RPC/archive endpoint'],
  ['apps/web/src/lib/security.ts', 'safeExplorerUrl'],
  ['apps/web/src/lib/security.ts', 'safeAddress'],
  ['apps/web/src/main.ts', 'VITE_LAUNCHPAD_CODE_HASH'],
  ['apps/web/src/main.ts', 'normalizeLaunch'],
  ['apps/web/src/main.ts', 'normalizeScoutContract'],
  ['apps/web/src/main.ts', 'verifyFactory'],
  ['apps/web/src/main.ts', 'verifyPool'],
  ['apps/web/src/main.ts', 'expectedPoolProtocolVersion'],
  ['apps/web/src/main.ts', 'Launch-token metadata commitment does not match the factory record'],
  ['apps/web/src/main.ts', 'authorizeWrite'],
  ['apps/web/src/main.ts', 'allowance === amount'],
  ['apps/web/src/main.ts', 'Recipient must be the connected wallet'],
  ['apps/web/src/main.ts', 'Price impact exceeds the 5% browser safety cap'],
  ['apps/web/src/main.ts', 'bestEffortRevoke']
]
for (const [file, needle] of required) {
  const text = fs.readFileSync(file, 'utf8')
  if (!text.includes(needle)) failures.push(`${file}: missing required control ${needle}`)
}

if (failures.length) {
  console.error('Static security checks failed:\n' + failures.map((x) => `- ${x}`).join('\n'))
  process.exit(1)
}
console.log(`Static security checks passed across ${files.length} source files.`)
