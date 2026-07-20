import test from 'node:test'
import assert from 'node:assert/strict'
import { maxUint256, parseUnits } from 'viem'
import { A, YEAR, createHarness, deadline, deployBase, launchParams, scheduleActions, ticker } from './harness.mjs'

test('timelocked stock delisting preserves self-directed LP exit', async () => {
  const h = createHarness()
  try {
    const { alice } = h.accounts
    const { stock, feed, launchpad } = await deployBase(h)
    await h.write(alice, stock, A.Stock, 'approve', [launchpad, maxUint256])
    await h.write(alice, launchpad, A.Launchpad, 'launch', [await launchParams(h, stock)])
    const record = await h.publicClient.readContract({ address: launchpad, abi: A.Launchpad.abi, functionName: 'launchAt', args: [0n] })
    const locker = await h.publicClient.readContract({ address: launchpad, abi: A.Launchpad.abi, functionName: 'liquidityLocker' })
    await h.increaseTime(YEAR + 1)
    await h.write(alice, locker, A.Locker, 'claim', [record.liquidityLockId])
    const lp = await h.publicClient.readContract({ address: record.pool, abi: A.Pool.abi, functionName: 'balanceOf', args: [alice.address] })

    await scheduleActions(h, launchpad, [{
      functionName: 'configureStock',
      args: [stock, feed, ticker('RHM'), 4 * 24 * 60 * 60, parseUnits('1000', 18), false, false]
    }])

    const preview = await h.publicClient.readContract({ address: record.pool, abi: A.Pool.abi, functionName: 'previewRemoveLiquidity', args: [lp / 2n] })
    await h.write(alice, record.pool, A.Pool, 'removeLiquidity', [
      lp / 2n,
      preview[0] * 99n / 100n,
      preview[1] * 99n / 100n,
      alice.address,
      await deadline(h)
    ])
    assert((await h.publicClient.readContract({ address: record.pool, abi: A.Pool.abi, functionName: 'balanceOf', args: [alice.address] })) > 0n)
  } finally { await h.close() }
})
