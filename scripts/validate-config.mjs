import fs from 'node:fs'
import process from 'node:process'

const file = process.argv[2]
if (!file) throw new Error('Usage: node scripts/validate-config.mjs <config.json>')
const config = JSON.parse(fs.readFileSync(file, 'utf8'))
const address = /^0x[0-9a-fA-F]{40}$/
const requiredAddress = ['owner', 'guardian', 'eligibilityGate', 'stockToken', 'stockPriceFeed']
const errors = []
if (config.chainId !== 46630) errors.push('chainId must be 46630 for Robinhood Chain testnet')
for (const key of requiredAddress) {
  if (!address.test(config[key] ?? '') || /^0x0{40}$/i.test(config[key])) errors.push(`${key} must be a nonzero EVM address`)
}
if (!Number.isInteger(config.maxOracleAgeSeconds) || config.maxOracleAgeSeconds < 60) errors.push('maxOracleAgeSeconds must be an integer >= 60')
if (!Number.isInteger(config.sequencerGraceSeconds) || config.sequencerGraceSeconds < 60) errors.push('sequencerGraceSeconds must be an integer >= 60')
if (!/^\d+$/.test(String(config.minInitialStockValueUsd18 ?? '')) || BigInt(config.minInitialStockValueUsd18 ?? 0) <= 0n) errors.push('minInitialStockValueUsd18 must be a positive integer string')
if (typeof config.stockTicker !== 'string' || !/^[A-Z0-9._-]{1,31}$/.test(config.stockTicker)) errors.push('stockTicker must be 1-31 uppercase ASCII characters')
if (config.complianceEnforced !== true) errors.push('complianceEnforced must be true in the handoff testnet configuration')
if (errors.length) {
  console.error(errors.map((x) => `- ${x}`).join('\n'))
  process.exit(1)
}
console.log(`Configuration ${file} passed validation.`)
