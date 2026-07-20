import test from 'node:test'
import { maxUint256, parseUnits } from 'viem'
import { A, YEAR, createHarness, deployBase, expectReject, launchParams } from './harness.mjs'

test('creator allocation is capped and initial liquidity lock duration is bounded', async () => {
  const h = createHarness()
  try {
    const { alice } = h.accounts
    const { stock, launchpad } = await deployBase(h, { compliance: false, tickerValue: 'CAP' })
    await h.write(alice, stock, A.Stock, 'approve', [launchpad, maxUint256])
    const tooMuch = await launchParams(h, stock, 'RUGX', 'Rug Allocation')
    tooMuch.creatorCoinAmount = parseUnits('100001', 18)
    tooMuch.poolCoinAmount = parseUnits('899999', 18)
    await expectReject(async () => h.write(alice, launchpad, A.Launchpad, 'launch', [tooMuch]), 'creator cap')
    const shortLock = await launchParams(h, stock, 'FAST', 'Short Lock')
    shortLock.liquidityLockDuration = YEAR - 1
    await expectReject(async () => h.write(alice, launchpad, A.Launchpad, 'launch', [shortLock]), 'lock bound')
  } finally { await h.close() }
})
