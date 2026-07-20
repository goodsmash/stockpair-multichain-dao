import process from 'node:process'

const ticker = process.argv[2] ?? ''
if (!/^[A-Z0-9._-]{1,31}$/.test(ticker)) {
  console.error('Ticker must be 1-31 uppercase ASCII characters: A-Z, 0-9, dot, underscore, or hyphen.')
  process.exit(1)
}
const bytes = Buffer.alloc(32)
Buffer.from(ticker, 'ascii').copy(bytes)
console.log(`0x${bytes.toString('hex')}`)
