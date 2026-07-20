import test from 'node:test'
import assert from 'node:assert/strict'
import { maxUint256, parseUnits } from 'viem'
import { A, createHarness, deadline, deployBase, expectReject, launchParams, looseDeadline } from './harness.mjs'

test('protocol rejects compromised-frontend deadlines and loose slippage minima', async () => {
  const h = createHarness()
  try {
    const { alice, bob } = h.accounts
    const { stock, launchpad } = await deployBase(h, { compliance: false, tickerValue: 'UIX' })
    await h.write(alice, stock, A.Stock, 'approve', [launchpad, maxUint256])
    const lateLaunch = await launchParams(h, stock, 'LATE', 'Late Deadline Coin'); lateLaunch.deadline = await looseDeadline(h)
    await expectReject(async () => h.write(alice, launchpad, A.Launchpad, 'launch', [lateLaunch]), 'launch deadline ceiling')
    await h.write(alice, launchpad, A.Launchpad, 'launch', [await launchParams(h, stock, 'SAFE', 'Safe Deadline Coin')])
    const record = await h.publicClient.readContract({ address: launchpad, abi: A.Launchpad.abi, functionName: 'launchAt', args: [0n] })
    const amountIn = parseUnits('1', 18)
    await h.write(bob, stock, A.Stock, 'approve', [record.pool, maxUint256])
    const quote = await h.publicClient.readContract({ address: record.pool, abi: A.Pool.abi, functionName: 'quoteExactInput', args: [stock, amountIn] })
    await expectReject(async () => h.write(bob, record.pool, A.Pool, 'swapExactStockForCoin', [amountIn, 1n, bob.address, await deadline(h)]), 'near-zero minimum output')
    await expectReject(async () => h.write(bob, record.pool, A.Pool, 'swapExactStockForCoin', [amountIn, quote * 97n / 100n, bob.address, await looseDeadline(h)]), 'swap deadline ceiling')
    await h.write(bob, record.pool, A.Pool, 'swapExactStockForCoin', [amountIn, quote * 97n / 100n, bob.address, await deadline(h)])
    assert((await h.publicClient.readContract({ address: record.coinToken, abi: A.Token.abi, functionName: 'balanceOf', args: [bob.address] })) > 0n)
  } finally { await h.close() }
})
