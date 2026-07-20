import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = new URL('../', import.meta.url)

function json(path) {
  return JSON.parse(fs.readFileSync(new URL(path, root), 'utf8'))
}

test('integration examples and schemas are valid JSON', () => {
  const files = [
    'config/alert-rules.example.json',
    'config/execution-policy.example.json',
    'config/launch-sources.example.json',
    'integrations/schemas/alert-rule.schema.json',
    'integrations/schemas/execution-policy.schema.json',
    'integrations/schemas/launch-source.schema.json',
    'integrations/schemas/unsigned-execution-plan.schema.json',
    'integrations/schemas/webhook-event.schema.json',
    'integrations/examples/unsigned-execution-plan.example.json',
    'integrations/examples/webhook-event.example.json',
    'integrations/openapi.json'
  ]
  for (const file of files) assert.doesNotThrow(() => json(file), file)
})

test('OpenAPI exposes launch radar read endpoints only', () => {
  const spec = json('integrations/openapi.json')
  assert.equal(spec.openapi, '3.1.0')
  assert.ok(spec.paths['/api/radar/candidates']?.get)
  assert.ok(spec.paths['/api/radar/sources']?.get)
  assert.ok(spec.paths['/api/radar/alerts']?.get)
  assert.ok(spec.paths['/api/radar/deployer-reputation']?.get)
  assert.ok(spec.paths['/api/radar/manipulation']?.get)
  assert.ok(spec.paths['/api/alerts/status']?.get)
  for (const methods of Object.values(spec.paths)) {
    assert.deepEqual(Object.keys(methods).filter((key) => !key.startsWith('x-')), ['get'])
  }
})


test('agent package exposes a read-only CLI and adapter template', () => {
  const pkg = json('packages/launch-intelligence-sdk/package.json')
  assert.equal(pkg.bin['stockpair-radar'], './bin/stockpair-radar.mjs')
  const cli = fs.readFileSync(new URL('../packages/launch-intelligence-sdk/bin/stockpair-radar.mjs', import.meta.url), 'utf8')
  assert.match(cli, /Read-only command/)
  assert.doesNotMatch(cli, /privateKey|sendTransaction|writeContract/)
  const template = fs.readFileSync(new URL('../integrations/templates/source-adapter.template.mjs', import.meta.url), 'utf8')
  assert.match(template, /runtime hash required/)
  assert.match(template, /Return null for unknown logs/)
})

test('unsigned execution plan forbids key custody and broadcasting', () => {
  const plan = json('integrations/examples/unsigned-execution-plan.example.json')
  assert.equal(plan.authorization.userSignatureRequired, true)
  assert.equal(plan.authorization.privateKeyIncluded, false)
  assert.equal(plan.authorization.broadcastAllowed, false)
})
