import test from 'node:test'
import assert from 'node:assert/strict'
import { maxUint256 } from 'viem'
import { A, YEAR, createHarness, deadline, deployBase, expectReject, launchParams } from './harness.mjs'

test('global pause blocks risk actions but preserves self-directed LP exit', async () => {
  const h = createHarness()
  try {
    const { alice, bob, guardian } = h.accounts
    const { stock, launchpad } = await deployBase(h)
    await h.write(alice, stock, A.Stock, 'approve', [launchpad, maxUint256])
    await h.write(alice, launchpad, A.Launchpad, 'launch', [await launchParams(h, stock)])
    const record = await h.publicClient.readContract({ address: launchpad, abi: A.Launchpad.abi, functionName: 'launchAt', args: [0n] })
    const locker = await h.publicClient.readContract({ address: launchpad, abi: A.Launchpad.abi, functionName: 'liquidityLocker' })
    await h.increaseTime(YEAR + 1)
    await h.write(alice, locker, A.Locker, 'claim', [record.liquidityLockId])
    const lp = await h.publicClient.readContract({ address: record.pool, abi: A.Pool.abi, functionName: 'balanceOf', args: [alice.address] })

    await h.write(guardian, launchpad, A.Launchpad, 'pause')
    await h.write(bob, stock, A.Stock, 'approve', [record.pool, 1n])
    await expectReject(async () => h.write(bob, record.pool, A.Pool, 'swapExactStockForCoin', [1n, 0n, bob.address, await deadline(h)]), 'pause must block swaps')
    const previewQuarter = await h.publicClient.readContract({ address: record.pool, abi: A.Pool.abi, functionName: 'previewRemoveLiquidity', args: [lp / 4n] })
    await expectReject(async () => h.write(alice, record.pool, A.Pool, 'removeLiquidity', [lp / 4n, previewQuarter[0] * 99n / 100n, previewQuarter[1] * 99n / 100n, bob.address, await deadline(h)]), 'exit must be self-directed')
    const previewHalf = await h.publicClient.readContract({ address: record.pool, abi: A.Pool.abi, functionName: 'previewRemoveLiquidity', args: [lp / 2n] })
    await h.write(alice, record.pool, A.Pool, 'removeLiquidity', [lp / 2n, previewHalf[0] * 99n / 100n, previewHalf[1] * 99n / 100n, alice.address, await deadline(h)])
    assert((await h.publicClient.readContract({ address: record.pool, abi: A.Pool.abi, functionName: 'balanceOf', args: [alice.address] })) > 0n)
  } finally { await h.close() }
})
