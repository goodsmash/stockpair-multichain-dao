import test from 'node:test'
import assert from 'node:assert/strict'
import { maxUint256, parseUnits } from 'viem'
import { A, configureStock, createHarness, expectReject, launchParams } from './harness.mjs'

test('fee-on-transfer stock tokens are rejected atomically', async () => {
  const h = createHarness()
  try {
    const { owner, alice } = h.accounts
    const feed = await h.deploy('Feed', [8, 10_000_000_000n])
    const launchpad = await h.deploy('Launchpad', [owner.address, owner.address])
    const feeToken = await h.deploy('FeeToken', ['Fee Stock', 'FEE', 100, alice.address, parseUnits('1000', 18)])
    await configureStock(h, launchpad, feeToken, feed, 'FEE', { requireFresh: false })
    await h.write(alice, feeToken, A.FeeToken, 'approve', [launchpad, maxUint256])
    await expectReject(async () => h.write(alice, launchpad, A.Launchpad, 'launch', [await launchParams(h, feeToken, 'FEEC', 'Fee Coin')]), 'fee token rejection')
    assert.equal(await h.publicClient.readContract({ address: launchpad, abi: A.Launchpad.abi, functionName: 'launchCount' }), 0n)
  } finally { await h.close() }
})
