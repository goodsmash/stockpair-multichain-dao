import test from 'node:test'
import assert from 'node:assert/strict'
import { getAddress, maxUint256, parseUnits } from 'viem'
import { A, YEAR, createHarness, deadline, deployBase, expectReject, launchParams } from './harness.mjs'

test('launch, trusted-pool provenance, trade, creator vesting and one-year LP lock', async () => {
  const h = createHarness()
  try {
    const { alice, bob } = h.accounts
    const { stock, launchpad } = await deployBase(h)
    await h.write(alice, stock, A.Stock, 'approve', [launchpad, maxUint256])
    await h.write(alice, launchpad, A.Launchpad, 'launch', [await launchParams(h, stock)])
    assert.equal(await h.publicClient.readContract({ address: launchpad, abi: A.Launchpad.abi, functionName: 'launchCount' }), 1n)

    const record = await h.publicClient.readContract({ address: launchpad, abi: A.Launchpad.abi, functionName: 'launchAt', args: [0n] })
    const pool = getAddress(record.pool)
    const coin = getAddress(record.coinToken)
    assert.equal(await h.publicClient.readContract({ address: launchpad, abi: A.Launchpad.abi, functionName: 'isTrustedPool', args: [pool, coin, stock] }), true)
    assert.equal(await h.publicClient.readContract({ address: coin, abi: A.Token.abi, functionName: 'issuer' }), launchpad)
    assert.equal(await h.publicClient.readContract({ address: coin, abi: A.Token.abi, functionName: 'balanceOf', args: [alice.address] }), 0n)

    const before = await h.publicClient.readContract({ address: pool, abi: A.Pool.abi, functionName: 'getPoolState' })
    assert.equal(before[0], parseUnits('900000', 18))
    assert.equal(before[1], parseUnits('100', 18))
    await h.write(bob, stock, A.Stock, 'approve', [pool, parseUnits('1', 18)])
    const quote = await h.publicClient.readContract({ address: pool, abi: A.Pool.abi, functionName: 'quoteExactInput', args: [stock, parseUnits('1', 18)] })
    await h.write(bob, pool, A.Pool, 'swapExactStockForCoin', [parseUnits('1', 18), quote * 99n / 100n, bob.address, await deadline(h)])

    const locker = await h.publicClient.readContract({ address: launchpad, abi: A.Launchpad.abi, functionName: 'liquidityLocker' })
    await expectReject(async () => h.write(alice, locker, A.Locker, 'claim', [record.liquidityLockId]), 'initial LP must remain locked')
    await h.increaseTime(YEAR + 1)
    await h.write(alice, locker, A.Locker, 'claim', [record.liquidityLockId])
    assert((await h.publicClient.readContract({ address: pool, abi: A.Pool.abi, functionName: 'balanceOf', args: [alice.address] })) > 0n)
  } finally { await h.close() }
})
