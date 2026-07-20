import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeBytecode } from '../services/indexer/src/risk.mjs'
import { toFunctionSelector } from 'viem'

test('empty code is blocked', () => {
  const result = analyzeBytecode('0x')
  assert.equal(result.status, 'BLOCKED')
  assert.equal(result.score, 100)
})

test('minimal proxy is dangerous', () => {
  const result = analyzeBytecode('0x363d3d373d3d3d363d73' + '11'.repeat(20) + '5af43d82803e903d91602b57fd5bf3')
  assert(['DANGER', 'BLOCKED'].includes(result.status))
  assert(result.findings.some((item) => item.code === 'MINIMAL_PROXY'))
})

test('privileged controls increase risk', () => {
  const code = '0x6000' + toFunctionSelector('blacklist(address)').slice(2) + toFunctionSelector('setTaxFeePercent(uint256)').slice(2) + '00'.repeat(100)
  const result = analyzeBytecode(code)
  assert(result.score >= 44)
  assert(result.findings.some((item) => item.signature === 'blacklist(address)'))
})

test('operator-pinned code hash is trusted', () => {
  const code = `0x${'60'.repeat(120)}`
  const first = analyzeBytecode(code)
  const result = analyzeBytecode(code, { trustedCodeHashes: new Set([first.codeHash.toLowerCase()]) })
  assert.equal(result.status, 'LOW')
  assert(result.score <= 5)
  assert(result.findings.some((item) => item.code === 'PINNED_CODE_HASH'))
})


test('pinned code cannot bypass registry denial', () => {
  const code = `0x${'61'.repeat(120)}`
  const first = analyzeBytecode(code)
  const result = analyzeBytecode(code, { trustedCodeHashes: new Set([first.codeHash.toLowerCase()]), registryApproved: false })
  assert.equal(result.status, 'BLOCKED')
  assert(result.findings.some((item) => item.code === 'NOT_PROTOCOL_APPROVED'))
})

test('production verification requirement fails closed', () => {
  const result = analyzeBytecode(`0x${'62'.repeat(120)}`, { requireVerified: true, verified: undefined })
  assert.equal(result.status, 'BLOCKED')
  assert(result.findings.some((item) => item.code === 'VERIFICATION_REQUIRED'))
})

test('pinned code cannot bypass dangerous selector evidence', () => {
  const code = '0x6000' + toFunctionSelector('mint(address,uint256)').slice(2) + toFunctionSelector('setSellFee(uint256)').slice(2) + '00'.repeat(120)
  const first = analyzeBytecode(code)
  const result = analyzeBytecode(code, { trustedCodeHashes: new Set([first.codeHash.toLowerCase()]) })
  assert.notEqual(result.status, 'LOW')
  assert(result.findings.some((item) => item.code === 'PRIVILEGED_SELECTOR'))
})

test('pinned code cannot bypass populated proxy slots', () => {
  const code = `0x${'63'.repeat(120)}`
  const first = analyzeBytecode(code)
  const result = analyzeBytecode(code, {
    trustedCodeHashes: new Set([first.codeHash.toLowerCase()]),
    proxySlots: { implementation: '0x1111111111111111111111111111111111111111' }
  })
  assert(['CAUTION', 'DANGER', 'BLOCKED'].includes(result.status))
  assert(result.findings.some((item) => item.code === 'EIP1967_IMPLEMENTATION'))
})
