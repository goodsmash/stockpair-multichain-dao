import test from 'node:test'
import assert from 'node:assert/strict'
import { encodeFunctionData, maxUint256, parseUnits } from 'viem'
import { A, ADMIN_DELAY, configureStock, createHarness, deadline, deployBase, expectReject, launchParams, ticker } from './harness.mjs'

test('timelock is mandatory and guardian can cancel queued administration', async () => {
  const h = createHarness()
  try {
    const { owner, guardian } = h.accounts
    const stock = await h.deploy('Stock', ['Strict Stock', 'STS', owner.address, parseUnits('1000', 18)])
    const feed = await h.deploy('Feed', [8, 10_000_000_000n])
    const launchpad = await h.deploy('Launchpad', [owner.address, guardian.address])
    const args = [stock, feed, ticker('STS'), 86_400, parseUnits('100', 18), true, true]
    await expectReject(async () => h.write(owner, launchpad, A.Launchpad, 'configureStock', args), 'unscheduled config')
    const callData = encodeFunctionData({ abi: A.Launchpad.abi, functionName: 'configureStock', args })
    await h.write(owner, launchpad, A.Launchpad, 'scheduleAdminAction', [callData])
    await expectReject(async () => h.write(owner, launchpad, A.Launchpad, 'configureStock', args), 'early config')
    const actionId = await h.publicClient.readContract({ address: launchpad, abi: A.Launchpad.abi, functionName: 'adminActionId', args: [callData] })
    await h.write(guardian, launchpad, A.Launchpad, 'cancelAdminAction', [actionId])
    await h.increaseTime(ADMIN_DELAY + 1)
    await expectReject(async () => h.write(owner, launchpad, A.Launchpad, 'configureStock', args), 'canceled config')
  } finally { await h.close() }
})

test('strict stock policy rejects privileged mint selectors and delegate proxies', async () => {
  const h = createHarness()
  try {
    const { owner } = h.accounts
    const feed = await h.deploy('Feed', [8, 10_000_000_000n])
    const launchpad = await h.deploy('Launchpad', [owner.address, owner.address])
    const dangerous = await h.deploy('DangerousStock', [owner.address, parseUnits('1000', 18)])
    await expectReject(() => configureStock(h, launchpad, dangerous, feed, 'DNG'), 'dangerous selector')
    const strict = await h.deploy('Stock', ['Implementation', 'IMP', owner.address, parseUnits('1000', 18)])
    const proxy = await h.deploy('DelegateProxy', [strict])
    await expectReject(() => configureStock(h, launchpad, proxy, feed, 'PRX'), 'delegate proxy')
  } finally { await h.close() }
})

test('creator vesting, minimum stock value, self-recipient and max-swap rules are enforced', async () => {
  const h = createHarness()
  try {
    const { alice, bob } = h.accounts
    const { stock, launchpad } = await deployBase(h, { compliance: false, tickerValue: 'HRD' })
    await h.write(alice, stock, A.Stock, 'approve', [launchpad, maxUint256])
    const underfunded = await launchParams(h, stock, 'DUST', 'Dust Pool')
    underfunded.stockAmount = parseUnits('1', 18)
    await expectReject(async () => h.write(alice, launchpad, A.Launchpad, 'launch', [underfunded]), 'minimum stock value')

    await h.write(alice, launchpad, A.Launchpad, 'launch', [await launchParams(h, stock, 'HARD', 'Hardened Coin')])
    const record = await h.publicClient.readContract({ address: launchpad, abi: A.Launchpad.abi, functionName: 'launchAt', args: [0n] })
    const vesting = await h.publicClient.readContract({ address: launchpad, abi: A.Launchpad.abi, functionName: 'creatorVestingVault' })
    assert.equal(await h.publicClient.readContract({ address: record.coinToken, abi: A.Token.abi, functionName: 'balanceOf', args: [alice.address] }), 0n)
    await expectReject(async () => h.write(alice, vesting, A.Vesting, 'claim', [record.creatorVestingId]), 'vesting cliff')
    await h.increaseTime(91 * 24 * 60 * 60)
    await h.write(alice, vesting, A.Vesting, 'claim', [record.creatorVestingId])
    assert((await h.publicClient.readContract({ address: record.coinToken, abi: A.Token.abi, functionName: 'balanceOf', args: [alice.address] })) > 0n)

    await h.write(bob, stock, A.Stock, 'approve', [record.pool, maxUint256])
    const one = parseUnits('1', 18)
    const oneQuote = await h.publicClient.readContract({ address: record.pool, abi: A.Pool.abi, functionName: 'quoteExactInput', args: [stock, one] })
    await expectReject(async () => h.write(bob, record.pool, A.Pool, 'swapExactStockForCoin', [one, oneQuote * 97n / 100n, alice.address, await deadline(h)]), 'arbitrary recipient')
    const six = parseUnits('6', 18)
    const sixQuote = await h.publicClient.readContract({ address: record.pool, abi: A.Pool.abi, functionName: 'quoteExactInput', args: [stock, six] })
    await expectReject(async () => h.write(bob, record.pool, A.Pool, 'swapExactStockForCoin', [six, sixQuote * 97n / 100n, bob.address, await deadline(h)]), 'max swap size')
  } finally { await h.close() }
})
