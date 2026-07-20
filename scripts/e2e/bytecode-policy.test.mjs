import test from 'node:test'
import assert from 'node:assert/strict'
import { parseUnits } from 'viem'
import { A, createHarness, expectReject } from './harness.mjs'

test('strict bytecode policy accepts reviewed fixed-supply code and rejects executable evasions', async () => {
  const h = createHarness()
  try {
    const { owner } = h.accounts
    const policyHarness = await h.deploy('PolicyHarness', [])
    const strict = await h.deploy('Stock', ['Reviewed Fixed Supply', 'RFS', owner.address, parseUnits('1000', 18)])
    const accepted = await h.publicClient.readContract({
      address: policyHarness,
      abi: A.PolicyHarness.abi,
      functionName: 'validate',
      args: [strict]
    })
    assert.match(accepted, /^0x[0-9a-f]{64}$/i)

    const dangerous = await h.deploy('DangerousStock', [owner.address, parseUnits('1000', 18)])
    await expectReject(
      () => h.publicClient.readContract({ address: policyHarness, abi: A.PolicyHarness.abi, functionName: 'validate', args: [dangerous] }),
      'privileged mint selector'
    )

    const proxy = await h.deploy('DelegateProxy', [strict])
    await expectReject(
      () => h.publicClient.readContract({ address: policyHarness, abi: A.PolicyHarness.abi, functionName: 'validate', args: [proxy] }),
      'delegate proxy'
    )

    const invalidBypass = await h.deploy('InvalidOpcodeBypass', [])
    await expectReject(
      () => h.publicClient.readContract({ address: policyHarness, abi: A.PolicyHarness.abi, functionName: 'validate', args: [invalidBypass] }),
      'jump-over-invalid delegatecall bypass'
    )

    const metadataBypass = await h.deploy('ExecutableMetadataBypass', [])
    await expectReject(
      () => h.publicClient.readContract({ address: policyHarness, abi: A.PolicyHarness.abi, functionName: 'validate', args: [metadataBypass] }),
      'executable-metadata delegatecall bypass'
    )
  } finally {
    await h.close()
  }
})
