import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

const root = process.cwd()
const required = [
  'integrations/robinhood/registry.json',
  'integrations/robinhood/schemas/robinhood-network-registry.schema.json',
  'integrations/robinhood/schemas/stock-token-snapshot.schema.json',
  'integrations/robinhood/schemas/cross-chain-message-plan.schema.json',
  'integrations/robinhood/schemas/finality-status.schema.json',
  'integrations/robinhood/schemas/account-abstraction-policy.schema.json',
  'integrations/robinhood/schemas/node-upgrade-policy.schema.json',
  'config/robinhood-stock-feeds.example.json',
  'packages/robinhood-chain-kit/package.json',
  'integrations/robinhood/examples/stock-token-request.json',
  'integrations/robinhood/examples/messaging-plan.example.json',
  'integrations/robinhood/examples/aa-policy.example.json',
  'integrations/robinhood/examples/node-upgrade-policy.example.json',
  'integrations/robinhood/agent-tasks.json',
  'integrations/robinhood/examples/native-agent.mjs',
  'integrations/robinhood/templates/capability-adapter.template.mjs',
  'docs/ROBINHOOD_NATIVE_INTEGRATION.md',
  'docs/ROBINHOOD_STOCK_TOKEN_INTEGRATION.md',
  'docs/ROBINHOOD_CROSS_CHAIN_AND_BRIDGE.md',
  'docs/ROBINHOOD_ACCOUNT_ABSTRACTION.md',
  'docs/ROBINHOOD_FINALITY_GAS_AND_NODES.md',
  'docs/ROBINHOOD_DOCS_COVERAGE_MATRIX.md',
  'docs/AGENT_START_HERE_v0.8.md',
  'integrations/openapi.json'
]

test('Robinhood integration files exist and JSON documents parse', () => {
  for (const relative of required) {
    const filename = path.join(root, relative)
    assert.ok(fs.existsSync(filename), `${relative} missing`)
    if (filename.endsWith('.json')) JSON.parse(fs.readFileSync(filename, 'utf8'))
  }
})

test('registry never treats public RPC as production infrastructure', () => {
  const registry = JSON.parse(fs.readFileSync(path.join(root, 'integrations/robinhood/registry.json'), 'utf8'))
  for (const network of Object.values(registry.networks)) {
    assert.match(network.publicRpcUrl, /^https:\/\//)
    assert.match(network.productionRpcPolicy, /(dedicated|Testnet)/)
  }
})

test('all generated plans and policies are explicitly unsigned or user-authorized', () => {
  const schemas = required.filter((item) => item.includes('/schemas/')).map((item) => fs.readFileSync(path.join(root, item), 'utf8')).join('\n')
  assert.match(schemas, /userSignatureRequired/)
  assert.match(schemas, /unsigned/)
  assert.match(schemas, /privateKeyStorageAllowed/)
})


test('OpenAPI exposes every Robinhood-native read-only route', () => {
  const openapi = JSON.parse(fs.readFileSync(path.join(root, 'integrations/openapi.json'), 'utf8'))
  assert.equal(openapi.info.version, '0.9.0')
  for (const route of ['/api/robinhood/capabilities', '/api/robinhood/network', '/api/robinhood/contracts', '/api/robinhood/account-abstraction', '/api/robinhood/gas', '/api/robinhood/node', '/api/robinhood/finality', '/api/robinhood/stock-token/{address}', '/api/robinhood/messaging-plan', '/api/robinhood/bridge-plan']) assert.ok(openapi.paths[route], `${route} missing from OpenAPI`)
})

test('agent docs preserve read-only, dynamic-registry and finality boundaries', () => {
  const docs = ['docs/ROBINHOOD_NATIVE_INTEGRATION.md', 'docs/ROBINHOOD_STOCK_TOKEN_INTEGRATION.md', 'docs/ROBINHOOD_CROSS_CHAIN_AND_BRIDGE.md', 'docs/ROBINHOOD_ACCOUNT_ABSTRACTION.md', 'docs/ROBINHOOD_FINALITY_GAS_AND_NODES.md'].map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n')
  assert.match(docs, /do not accept private keys|never accepts a private key|no private keys/i)
  assert.match(docs, /intentionally (?:empty|not hard-coded)/i)
  assert.match(docs, /soft sequencer confirmation/i)
  assert.match(docs, /address alias|aliased L1 address/i)
  assert.match(docs, /automatic node upgrades remain disabled|not an auto-update|not an auto-update instruction/i)
})


test('Robinhood agent task board and adapter template forbid autonomous execution', () => {
  const tasks = JSON.parse(fs.readFileSync(path.join(root, 'integrations/robinhood/agent-tasks.json'), 'utf8'))
  assert.equal(tasks.policy.privateKeyStorageAllowed, false)
  assert.equal(tasks.policy.transactionBroadcastingAllowed, false)
  assert.equal(tasks.policy.autoExecutionAllowed, false)
  assert.ok(tasks.tasks.length >= 8)
  const template = fs.readFileSync(path.join(root, 'integrations/robinhood/templates/capability-adapter.template.mjs'), 'utf8')
  assert.match(template, /readOnly: true/)
  assert.match(template, /eligibleForReview: false/)
  assert.doesNotMatch(template, /sendTransaction|writeContract/)
})
