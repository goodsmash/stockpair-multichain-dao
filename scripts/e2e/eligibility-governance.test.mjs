import test from 'node:test'
import assert from 'node:assert/strict'
import { encodeFunctionData } from 'viem'
import { A, ADMIN_DELAY, createHarness, expectReject } from './harness.mjs'

test('eligibility recovery is delayed, cancelable, bounded and ownership acceptance expires', async () => {
  const h = createHarness()
  try {
    const { owner, alice, bob, guardian } = h.accounts
    const gate = await h.deploy('EligibilityGate', [owner.address, alice.address, guardian.address])
    await expectReject(async () => h.write(owner, gate, A.EligibilityGate, 'setAttestor', [bob.address]), 'immediate attestor replacement')
    const setAttestorData = encodeFunctionData({ abi: A.EligibilityGate.abi, functionName: 'setAttestor', args: [bob.address] })
    await h.write(owner, gate, A.EligibilityGate, 'scheduleAdminAction', [setAttestorData])
    const actionId = await h.publicClient.readContract({ address: gate, abi: A.EligibilityGate.abi, functionName: 'adminActionId', args: [setAttestorData] })
    await h.write(guardian, gate, A.EligibilityGate, 'cancelAdminAction', [actionId])
    await h.increaseTime(ADMIN_DELAY + 1)
    await expectReject(async () => h.write(owner, gate, A.EligibilityGate, 'setAttestor', [bob.address]), 'guardian-canceled attestor replacement')

    const now = Number((await h.publicClient.getBlock()).timestamp)
    await expectReject(async () => h.write(alice, gate, A.EligibilityGate, 'setEligibility', [bob.address, BigInt(now + 31 * 24 * 60 * 60)]), 'eligibility duration bound')
    await h.write(alice, gate, A.EligibilityGate, 'setEligibility', [bob.address, BigInt(now + 29 * 24 * 60 * 60)])
    assert.equal(await h.publicClient.readContract({ address: gate, abi: A.EligibilityGate.abi, functionName: 'isEligible', args: [bob.address] }), true)
    await h.write(guardian, gate, A.EligibilityGate, 'emergencyDeny', [bob.address])
    assert.equal(await h.publicClient.readContract({ address: gate, abi: A.EligibilityGate.abi, functionName: 'isEligible', args: [bob.address] }), false)
    await expectReject(async () => h.write(owner, gate, A.EligibilityGate, 'clearEmergencyDeny', [bob.address]), 'unscheduled denial clearing')
    const clearData = encodeFunctionData({ abi: A.EligibilityGate.abi, functionName: 'clearEmergencyDeny', args: [bob.address] })
    await h.write(owner, gate, A.EligibilityGate, 'scheduleAdminAction', [clearData])
    await h.increaseTime(ADMIN_DELAY + 1)
    await h.write(owner, gate, A.EligibilityGate, 'clearEmergencyDeny', [bob.address])

    const transferData = encodeFunctionData({ abi: A.EligibilityGate.abi, functionName: 'transferOwnership', args: [bob.address] })
    await h.write(owner, gate, A.EligibilityGate, 'scheduleAdminAction', [transferData])
    await h.increaseTime(ADMIN_DELAY + 1)
    await h.write(owner, gate, A.EligibilityGate, 'transferOwnership', [bob.address])
    await h.increaseTime(7 * 24 * 60 * 60 + 1)
    await expectReject(async () => h.write(bob, gate, A.EligibilityGate, 'acceptOwnership'), 'expired ownership acceptance')
  } finally { await h.close() }
})
