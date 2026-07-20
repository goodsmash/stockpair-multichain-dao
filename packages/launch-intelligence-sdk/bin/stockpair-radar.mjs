#!/usr/bin/env node
import { StockPairLaunchIntelligenceClient } from '../src/index.js'

function usage() {
  console.error(`Usage: stockpair-radar <sources|candidates|alerts> --base-url <https://indexer.example> [--api-version 0.9.0] [--chain-id N] [--min-score N] [--max-risk-score N] [--limit N] [--query TEXT]\n\nRead-only command. It never signs or broadcasts transactions.`)
}

function parse(argv) {
  const [command, ...rest] = argv
  const options = {}
  for (let i = 0; i < rest.length; i += 1) {
    const key = rest[i]
    if (!key.startsWith('--')) throw new Error(`unexpected argument: ${key}`)
    const value = rest[++i]
    if (value === undefined || value.startsWith('--')) throw new Error(`missing value for ${key}`)
    options[key.slice(2)] = value
  }
  return { command, options }
}

function positiveInteger(value, name, { max = Number.MAX_SAFE_INTEGER } = {}) {
  if (value === undefined) return undefined
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > max) throw new Error(`${name} must be an integer between 1 and ${max}`)
  return parsed
}

try {
  const { command, options } = parse(process.argv.slice(2))
  if (!['sources', 'candidates', 'alerts'].includes(command) || !options['base-url']) {
    usage()
    process.exitCode = 2
  } else {
    const client = new StockPairLaunchIntelligenceClient({ baseUrl: options['base-url'], expectedApiVersion: options['api-version'] })
    const query = {
      chainId: positiveInteger(options['chain-id'], 'chain-id'),
      minScore: positiveInteger(options['min-score'], 'min-score', { max: 100 }),
      maxRiskScore: positiveInteger(options['max-risk-score'], 'max-risk-score', { max: 100 }),
      limit: positiveInteger(options.limit, 'limit', { max: 500 }),
      q: options.query
    }
    const result = command === 'sources'
      ? await client.getSources()
      : command === 'alerts'
        ? await client.getAlerts(query)
        : await client.getCandidates(query)
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
