import test from 'node:test'
import assert from 'node:assert/strict'

const BPS = 10_000n

function amountOut(amountIn, reserveIn, reserveOut, feeBps) {
  if (amountIn <= 0n || reserveIn <= 0n || reserveOut <= 0n) return 0n
  const adjusted = amountIn * (BPS - feeBps)
  return adjusted * reserveOut / (reserveIn * BPS + adjusted)
}

function xorshift(seed = 0x9e3779b97f4a7c15n) {
  let state = seed
  return () => {
    state ^= state << 13n
    state ^= state >> 7n
    state ^= state << 17n
    state &= (1n << 64n) - 1n
    return state
  }
}

test('known quote matches constant-product formula', () => {
  const out = amountOut(1n * 10n ** 18n, 100n * 10n ** 18n, 900_000n * 10n ** 18n, 30n)
  assert.equal(out, 8_884_422_309_573_551_689_654n)
})

test('100,000 deterministic swaps preserve k and cannot drain the output reserve', () => {
  const random = xorshift()
  for (let i = 0; i < 100_000; i++) {
    const reserveIn = (random() % 10_000_000_000n + 10_000n) * 10n ** 12n
    const reserveOut = (random() % 10_000_000_000n + 10_000n) * 10n ** 12n
    const amountIn = (random() % (reserveIn / 2n + 1n)) + 1n
    const fee = random() % 101n
    const out = amountOut(amountIn, reserveIn, reserveOut, fee)
    assert.ok(out > 0n)
    assert.ok(out < reserveOut)
    const oldK = reserveIn * reserveOut
    const newK = (reserveIn + amountIn) * (reserveOut - out)
    assert.ok(newK >= oldK, `invariant failed at iteration ${i}`)
  }
})

test('quotes are monotonic in exact input', () => {
  const reserveIn = 300_000n * 10n ** 18n
  const reserveOut = 250n * 10n ** 18n
  let previous = 0n
  for (let i = 1n; i <= 10_000n; i++) {
    const current = amountOut(i * 10n ** 14n, reserveIn, reserveOut, 30n)
    assert.ok(current >= previous)
    previous = current
  }
})

test('proportional liquidity mint and burn never overpays reserves', () => {
  const random = xorshift(0x123456789abcdefn)
  for (let i = 0; i < 50_000; i++) {
    const reserveCoin = random() % 10n ** 28n + 10n ** 18n
    const reserveStock = random() % 10n ** 26n + 10n ** 18n
    const supply = random() % 10n ** 24n + 1_000n
    const coinIn = random() % reserveCoin + 1n
    const stockIn = coinIn * reserveStock / reserveCoin
    if (stockIn === 0n) continue
    const shares = [coinIn * supply / reserveCoin, stockIn * supply / reserveStock].reduce((a, b) => a < b ? a : b)
    if (shares === 0n) continue
    const combinedSupply = supply + shares
    const coinOut = shares * (reserveCoin + coinIn) / combinedSupply
    const stockOut = shares * (reserveStock + stockIn) / combinedSupply
    assert.ok(coinOut <= coinIn)
    assert.ok(stockOut <= stockIn)
  }
})

test('contract-side swap input cap rejects more than 5% of the input reserve', () => {
  const maximumAllowed = (reserveIn) => reserveIn * 500n / 10_000n
  const reserve = 100n * 10n ** 18n
  assert.equal(maximumAllowed(reserve), 5n * 10n ** 18n)
  assert.ok(6n * 10n ** 18n > maximumAllowed(reserve))
})
