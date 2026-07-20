import test from 'node:test'
import assert from 'node:assert/strict'
import { encodeFunctionData, maxUint256, parseUnits } from 'viem'
import { A, configureStock, createHarness, launchParams } from './harness.mjs'

test('reentrant stock callback cannot enter the launch function twice', async () => {
  const h = createHarness()
  try {
    const { owner, alice } = h.accounts
    const feed = await h.deploy('Feed', [8, 10_000_000_000n])
    const launchpad = await h.deploy('Launchpad', [owner.address, owner.address])
    const reentrant = await h.deploy('ReentrantToken', ['Reentrant Stock', 'RNT', alice.address, parseUnits('1000', 18)])
    await configureStock(h, launchpad, reentrant, feed, 'RNT', { requireFresh: false })
    await h.write(alice, reentrant, A.ReentrantToken, 'approve', [launchpad, maxUint256])
    const callback = encodeFunctionData({ abi: A.Launchpad.abi, functionName: 'launch', args: [await launchParams(h, reentrant, 'NEST', 'Nested Coin')] })
    await h.write(alice, reentrant, A.ReentrantToken, 'arm', [launchpad, callback])
    await h.write(alice, launchpad, A.Launchpad, 'launch', [await launchParams(h, reentrant, 'RENT', 'Reentrant Coin')])
    assert.equal(await h.publicClient.readContract({ address: reentrant, abi: A.ReentrantToken.abi, functionName: 'lastCallbackSucceeded' }), false)
    assert.equal(await h.publicClient.readContract({ address: launchpad, abi: A.Launchpad.abi, functionName: 'launchCount' }), 1n)
  } finally { await h.close() }
})
