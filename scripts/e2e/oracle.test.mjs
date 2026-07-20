import test from 'node:test'
import { maxUint256, parseUnits } from 'viem'
import { A, configureStock, createHarness, expectReject, launchParams } from './harness.mjs'

test('stale and invalid oracle rounds block launches', async () => {
  const h = createHarness()
  try {
    const { owner, alice } = h.accounts
    const stock = await h.deploy('Stock', ['Oracle Stock', 'ORC', alice.address, parseUnits('1000', 18)])
    const feed = await h.deploy('Feed', [8, 1_000_000_000n])
    const launchpad = await h.deploy('Launchpad', [owner.address, owner.address])
    await configureStock(h, launchpad, stock, feed, 'ORC', { maxAge: 10 })
    await h.write(alice, stock, A.Stock, 'approve', [launchpad, maxUint256])
    await h.write(owner, feed, A.Feed, 'setRoundData', [9n, 1_000_000_000n, 1n, 1n, 9n])
    await expectReject(async () => h.write(alice, launchpad, A.Launchpad, 'launch', [await launchParams(h, stock, 'ORCL', 'Oracle Coin')]), 'stale oracle')
    await h.write(owner, feed, A.Feed, 'setRoundData', [10n, 0n, 1n, BigInt(Math.floor(Date.now() / 1000)), 10n])
    await expectReject(async () => h.write(alice, launchpad, A.Launchpad, 'launch', [await launchParams(h, stock, 'ORCZ', 'Zero Oracle Coin')]), 'zero oracle')
  } finally { await h.close() }
})
