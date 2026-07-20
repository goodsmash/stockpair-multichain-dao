import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const APP_VERSION = '0.9.0'
const PROTOCOL_VERSION = '0.6.0'
const required = [
  'README.md', 'AGENTS.md', 'SECURITY.md', 'CHANGELOG.md', 'COMPLETE_FINAL_HANDOFF.md',
  'COMPLETE_V0.7_INTELLIGENCE_HANDOFF.md', 'COMPLETE_V0.8_ROBINHOOD_NATIVE_HANDOFF.md', 'COMPLETE_V0.9_FINAL_HANDOFF.md',
  'package.json', 'package-lock.json', '.nvmrc', 'vercel.json', '.vercelignore',
  '.github/workflows/ci.yml', '.github/workflows/release.yml', '.github/dependabot.yml',
  'docs/AGENT_HANDOFF.md', 'docs/AGENT_START_HERE_v0.7.md', 'docs/AGENT_START_HERE_v0.8.md', 'docs/AGENT_START_HERE_v0.9.md',
  'docs/LOCAL_DEVELOPMENT.md', 'docs/VERCEL_DEPLOYMENT.md', 'docs/INDEXER_DEPLOYMENT.md', 'docs/GITHUB_HANDOFF.md',
  'docs/ENVIRONMENT_REFERENCE.md', 'docs/USER_ACCEPTANCE_TESTS.md', 'docs/RELEASE_NOTES_v0.9.0.md',
  'docs/V0.9.0_REJECTION_REMEDIATION.md', 'docs/INDEXER_API_COMPATIBILITY.md', 'docs/CLEAN_CHECKOUT_AND_RUNTIME_READINESS.md',
  'docs/DIRECT_RPC_AND_HOSTED_INDEXER.md', 'docs/EXTERNAL_DEX_EXECUTION.md', 'docs/ALERT_DELIVERY.md', 'docs/MAINNET_DEPLOYMENT_RUNBOOK.md',
  'docs/ROBINHOOD_NATIVE_INTEGRATION.md', 'docs/ROBINHOOD_STOCK_TOKEN_INTEGRATION.md',
  'docs/ROBINHOOD_CROSS_CHAIN_AND_BRIDGE.md', 'docs/ROBINHOOD_ACCOUNT_ABSTRACTION.md',
  'docs/ROBINHOOD_FINALITY_GAS_AND_NODES.md', 'docs/ROBINHOOD_DOCS_COVERAGE_MATRIX.md',
  'docs/SAFE_LAUNCH_RADAR_AND_EXECUTION.md', 'docs/SAFE_EARLY_LAUNCH_TOOLKIT.md', 'docs/MULTICHAIN_DAO_INTELLIGENCE.md',
  'apps/web/public/manifest.webmanifest', 'apps/web/scripts/validate-env.mjs', 'apps/web/scripts/harden-dist.mjs',
  'services/indexer/package.json', 'services/indexer/src/server.mjs', 'services/indexer/src/config.mjs',
  'services/indexer/src/security/public-endpoint.mjs', 'deploy/indexer/Dockerfile', 'deploy/indexer/README.md',
  'packages/launch-intelligence-sdk/package.json', 'packages/launch-intelligence-sdk/src/index.js',
  'packages/launch-intelligence-sdk/src/index.d.ts', 'packages/launch-intelligence-sdk/bin/stockpair-radar.mjs',
  'packages/robinhood-chain-kit/package.json', 'packages/robinhood-chain-kit/src/index.js',
  'packages/robinhood-chain-kit/src/index.d.ts', 'packages/robinhood-chain-kit/bin/stockpair-robinhood.mjs',
  'integrations/openapi.json', 'integrations/agent-tasks.json', 'integrations/v0.9-build-list.json', 'integrations/robinhood/registry.json',
  'integrations/schemas/webhook-event.schema.json', 'integrations/examples/webhook-event.example.json',
  'scripts/doctor.mjs', 'scripts/setup-local.mjs', 'scripts/start-demo.mjs', 'scripts/verify-clean-install.mjs',
  'scripts/indexer-runtime-security.test.mjs', 'scripts/v090-intelligence.test.mjs', 'scripts/lib/load-ganache.mjs',
  'scripts/deploy-robinhood-mainnet.sh', 'script/DeployRobinhoodMainnet.s.sol', 'script/ExecuteRobinhoodMainnetSetup.s.sol',
  'apps/web/src/lib/direct-rpc.ts', 'apps/web/src/lib/dex.ts', 'apps/web/scripts/direct-dex-runtime.test.mjs',
  'services/indexer/src/intelligence/reputation.mjs', 'services/indexer/src/alerts/delivery.mjs', 'services/indexer/src/alerts/protocol-monitor.mjs',
  'deploy/hosted/render.yaml', 'deploy/hosted/fly.toml', 'deploy/hosted/railway.json', 'deploy/hosted/README.md',
  'artifacts/solc/_build-info.json',
  'qa/V0.9.0_FINAL_VERIFICATION.json', 'qa/demo-smoke-v0.9.0/summary.json',
  'qa/verification-logs-v0.9.0/e2e-summary.json', 'qa/clean-install-v0.9.0.json',
  'qa/dependency-audit-v0.9.0.json', 'qa/production-build-v0.9.0.json', 'qa/multichain-dao-intelligence-v0.9.0.json',
  'MULTICHAIN_DAO_HANDOFF.md'
]
const errors = []
const exists = (relative) => fs.existsSync(path.join(root, relative))
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8')
const json = (relative) => JSON.parse(read(relative))

for (const file of required) if (!exists(file)) errors.push(`Missing ${file}`)

const workspaceFiles = [
  'package.json', 'apps/web/package.json', 'services/indexer/package.json',
  'packages/launch-intelligence-sdk/package.json', 'packages/robinhood-chain-kit/package.json'
]
for (const file of workspaceFiles) {
  if (!exists(file)) continue
  const value = json(file)
  if (value.version !== APP_VERSION) errors.push(`${file} version must be ${APP_VERSION}`)
}

if (exists('package.json')) {
  const pkg = json('package.json')
  const expectedWorkspaces = ['apps/web', 'services/indexer', 'packages/launch-intelligence-sdk', 'packages/robinhood-chain-kit']
  for (const workspace of expectedWorkspaces) if (!pkg.workspaces?.includes(workspace)) errors.push(`Root workspace missing ${workspace}`)
  if (pkg.engines?.node !== '>=22.12 <23') errors.push('Node engine must be >=22.12 <23')
  if (pkg.engines?.npm !== '>=10 <11') errors.push('npm engine must be >=10 <11')
  if (pkg.packageManager !== 'npm@10.9.2') errors.push('packageManager must be npm@10.9.2')
  for (const script of ['doctor', 'setup', 'local', 'clean:local', 'verify:clean-install', 'test:quick', 'check:release']) {
    if (!pkg.scripts?.[script]) errors.push(`Root script missing ${script}`)
  }
}
if (exists('.nvmrc') && read('.nvmrc').trim() !== '22.16.0') errors.push('.nvmrc must pin 22.16.0')

function walkFiles(dir, output = []) {
  if (!fs.existsSync(dir)) return output
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git'].includes(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walkFiles(full, output)
    else if (entry.isFile()) output.push(full)
  }
  return output
}
const allFiles = walkFiles(root)
const nestedLocks = allFiles.filter((file) => path.basename(file) === 'package-lock.json' && path.resolve(file) !== path.join(root, 'package-lock.json'))
for (const file of nestedLocks) errors.push(`Nested lockfile is prohibited: ${path.relative(root, file)}`)

for (const file of [
  'integrations/openapi.json', 'integrations/agent-tasks.json', 'integrations/v0.9-build-list.json', 'integrations/robinhood/registry.json',
  'integrations/schemas/webhook-event.schema.json', 'integrations/examples/webhook-event.example.json',
  'qa/V0.9.0_FINAL_VERIFICATION.json', 'qa/demo-smoke-v0.9.0/summary.json',
  'qa/verification-logs-v0.9.0/e2e-summary.json', 'qa/clean-install-v0.9.0.json',
  'qa/dependency-audit-v0.9.0.json', 'qa/production-build-v0.9.0.json', 'qa/multichain-dao-intelligence-v0.9.0.json'
]) {
  if (!exists(file)) continue
  try { json(file) } catch (error) { errors.push(`Invalid JSON in ${file}: ${error.message}`) }
}

if (exists('integrations/openapi.json')) {
  const openapi = json('integrations/openapi.json')
  if (openapi.info?.version !== APP_VERSION) errors.push(`OpenAPI version must be ${APP_VERSION}`)
  if (openapi.components?.headers?.StockPairApiVersion?.schema?.const !== APP_VERSION) errors.push('OpenAPI exact API-version header is missing')
  for (const [route, methods] of Object.entries(openapi.paths ?? {})) {
    const executable = Object.keys(methods).filter((key) => !key.startsWith('x-') && key !== 'get' && key !== 'parameters')
    if (executable.length) errors.push(`OpenAPI route ${route} exposes non-read methods: ${executable.join(',')}`)
    for (const operation of Object.values(methods)) {
      if (!operation || typeof operation !== 'object' || !operation.responses) continue
      for (const response of Object.values(operation.responses)) {
        if (!response?.headers?.['X-StockPair-API-Version']) errors.push(`OpenAPI response on ${route} lacks API version header`)
      }
    }
  }
}

if (exists('apps/web/src/main.ts')) {
  const main = read('apps/web/src/main.ts')
  for (const requiredSource of [
    "appVersion: '0.9.0'", "expectedIndexerApiVersion = '0.9.0'", 'x-stockpair-api-version',
    'indexerApiCompatible', 'authorizeWrite', 'reviewTransaction', 'normalizeLaunch',
    'expectedPoolProtocolVersion', 'allowance === amount', 'STOCKPAIR_LAUNCHPAD_V0.6.0'
  ]) if (!main.includes(requiredSource)) errors.push(`Browser invariant missing: ${requiredSource}`)
}
if (exists('apps/web/src/lib/security.ts') && !read('apps/web/src/lib/security.ts').includes('safeExplorerUrl')) errors.push('Safe explorer URL validation is missing')
if (exists('apps/web/src/main.ts')) {
  const main = read('apps/web/src/main.ts')
  for (const requiredSource of ['directRpcFallbackEnabled', 'directRpcLookback', 'quoteBestDex', 'quickBuyConfirmations', 'VITE_DEX_ADAPTERS_JSON']) {
    if (!main.includes(requiredSource)) errors.push(`v0.9 browser resilience invariant missing: ${requiredSource}`)
  }
  if (!main.includes("if (!indexerUrl) throw new Error('Hosted indexer is not configured; using direct RPC fallback')")) errors.push('Blank-indexer failover guard is missing')
}
if (exists('apps/web/src/lib/direct-rpc.ts')) {
  const direct = read('apps/web/src/lib/direct-rpc.ts')
  for (const requiredSource of ['scanRecentDeployments', 'fromBlock', 'toBlock', '100']) if (!direct.includes(requiredSource)) errors.push(`Direct RPC invariant missing: ${requiredSource}`)
}
if (exists('services/indexer/src/scout.mjs')) {
  const scout = read('services/indexer/src/scout.mjs')
  for (const requiredSource of ['cacheTime: 0', 'scanAddress', 'recordContractActivity', 'refreshDaos', "? 'stalled'", 'pool-liquidity-removed']) {
    if (!scout.includes(requiredSource)) errors.push(`Multi-chain Scout invariant missing: ${requiredSource}`)
  }
}
if (exists('services/indexer/src/intelligence/dao-intelligence.mjs')) {
  const dao = read('services/indexer/src/intelligence/dao-intelligence.mjs')
  for (const requiredSource of ['analyzeDaoBytecode', 'probeDaoContract', 'assessDaoDormancy', 'dormant-candidate']) {
    if (!dao.includes(requiredSource)) errors.push(`DAO intelligence invariant missing: ${requiredSource}`)
  }
}

if (exists('apps/web/src/lib/dex.ts')) {
  const dex = read('apps/web/src/lib/dex.ts')
  for (const requiredSource of ['factoryCodeHash', 'routerCodeHash', 'wrappedNativeCodeHash', 'pairCodeHash', 'poolCodeHash', 'quoterCodeHash', 'slippageBps > 500']) if (!dex.includes(requiredSource)) errors.push(`DEX invariant missing: ${requiredSource}`)
}

if (exists('services/indexer/src/server.mjs')) {
  const server = read('services/indexer/src/server.mjs')
  for (const requiredSource of [
    "'x-stockpair-api-version': '0.9.0'", 'function hostAllowed', 'Host not allowed',
    'function originAllowed', 'Request URI too long', 'queryInteger', 'queryHash', 'removeStream', 'writeStream'
  ]) if (!server.includes(requiredSource)) errors.push(`Indexer invariant missing: ${requiredSource}`)
}
if (exists('services/indexer/src/config.mjs')) {
  const config = read('services/indexer/src/config.mjs')
  for (const requiredSource of ['ALLOWED_HOSTS', 'HTTPS RPC endpoint', 'HTTPS explorer endpoint', 'WSS', 'LOCAL_DEMO_ACK']) {
    if (!config.includes(requiredSource)) errors.push(`Indexer config invariant missing: ${requiredSource}`)
  }
}
if (exists('services/indexer/src/indexer.mjs')) {
  const source = read('services/indexer/src/indexer.mjs')
  if (!source.includes('rpcEndpoint: publicEndpointMetadata(config.rpcUrl)')) errors.push('Public RPC endpoint redaction is missing')
}

if (exists('services/indexer/src/alerts/delivery.mjs')) {
  const delivery = read('services/indexer/src/alerts/delivery.mjs')
  for (const requiredSource of ['createHmac', 'sha256', 'redirect', 'config.alertWebhookUrl']) if (!delivery.includes(requiredSource)) errors.push(`Alert delivery invariant missing: ${requiredSource}`)
}
if (exists('services/indexer/src/alerts/protocol-monitor.mjs')) {
  const monitor = read('services/indexer/src/alerts/protocol-monitor.mjs')
  for (const requiredSource of ['liquidity-removed', 'ownership-changed', 'large-swap', 'emergency-change']) if (!monitor.includes(requiredSource)) errors.push(`Protocol alert invariant missing: ${requiredSource}`)
}
if (exists('scripts/deploy-robinhood-mainnet.sh')) {
  const deploy = read('scripts/deploy-robinhood-mainnet.sh')
  for (const requiredSource of ['DEPLOY_MODE', 'simulate', 'MAINNET_DEPLOYMENT_ACK', '4663', 'PRIVATE_KEY']) if (!deploy.includes(requiredSource)) errors.push(`Mainnet deployment guard missing: ${requiredSource}`)
}
for (const sdkPath of ['packages/launch-intelligence-sdk/src/index.js', 'packages/robinhood-chain-kit/src/index.js']) {
  if (!exists(sdkPath)) continue
  const source = read(sdkPath)
  for (const requiredSource of ['DEFAULT_API_VERSION', 'x-stockpair-api-version', 'unexpected content type', 'response exceeds SDK limit', 'non-loopback indexer URLs must use HTTPS']) {
    if (!source.includes(requiredSource)) errors.push(`${sdkPath} missing ${requiredSource}`)
  }
  if (/sendTransaction|writeContract|privateKey|mnemonic/i.test(source)) errors.push(`${sdkPath} contains a transaction or key primitive`)
}
if (exists('packages/launch-intelligence-sdk/src/index.js') && !read('packages/launch-intelligence-sdk/src/index.js').includes('verify the indexer API with a read request before subscribing')) errors.push('SDK SSE handshake gate is missing')

if (exists('vercel.json')) {
  const vercel = json('vercel.json')
  if (vercel.installCommand !== 'npm ci --ignore-scripts --no-audit --no-fund') errors.push('Vercel must use the root locked install')
  if (vercel.buildCommand !== 'npm run build:web:vercel') errors.push('Vercel build command must use root workspace script')
  if (vercel.outputDirectory !== 'apps/web/dist') errors.push('Vercel outputDirectory must be apps/web/dist')
}
if (exists('deploy/indexer/Dockerfile')) {
  const dockerfile = read('deploy/indexer/Dockerfile')
  if (!dockerfile.includes('--workspace @stockpair/indexer')) errors.push('Indexer container must install only the declared indexer workspace')
  if (!dockerfile.includes('USER node')) errors.push('Indexer container must run unprivileged')
}
if (exists('.github/workflows/ci.yml')) {
  const ci = read('.github/workflows/ci.yml')
  if (!ci.includes("NODE_VERSION: '22.16.0'")) errors.push('CI Node version must be 22.16.0')
  if ((ci.match(/npm ci --ignore-scripts --no-audit --no-fund/g) ?? []).length < 1) errors.push('CI root locked install is missing')
  if (/npm --prefix apps\/web ci/.test(ci)) errors.push('CI contains a prohibited second browser install')
}

for (const forbidden of ['apps/web/.env.local', 'deployments/local.json', '.env', '.env.production', '.env.development']) {
  if (exists(forbidden)) errors.push(`Release tree contains local or secret state: ${forbidden}`)
}

const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\b(?:sk_live|ghp_|github_pat_|AKIA)[A-Za-z0-9_=-]{12,}/,
  /\b(?:PRIVATE_KEY|DEPLOYER_PRIVATE_KEY|SECRET_KEY)\s*=\s*0x[0-9a-fA-F]{64}\b/,
  /\b(?:MNEMONIC|SEED_PHRASE)\s*=\s*["']?(?:[a-z]{3,}\s+){11,23}[a-z]{3,}/i
]
for (const full of allFiles) {
  const relative = path.relative(root, full)
  if (/\.(?:png|jpg|jpeg|gif|webp|ico|woff2?|zip|tgz|gz)$/i.test(relative)) continue
  const stat = fs.statSync(full)
  if (stat.size > 5_000_000) continue
  let text
  try { text = fs.readFileSync(full, 'utf8') } catch { continue }
  if (secretPatterns.some((pattern) => pattern.test(text))) errors.push(`Potential secret pattern in ${relative}`)
}

if (errors.length) {
  console.error('Release check failed:')
  for (const error of [...new Set(errors)]) console.error(`- ${error}`)
  process.exit(1)
}
const digest = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'package-lock.json'))).digest('hex')
console.log(JSON.stringify({
  ok: true,
  appVersion: APP_VERSION,
  protocolVersion: PROTOCOL_VERSION,
  requiredFiles: required.length,
  workspacePackages: workspaceFiles.length,
  packageLockSha256: digest,
  checkedAt: new Date().toISOString()
}, null, 2))
