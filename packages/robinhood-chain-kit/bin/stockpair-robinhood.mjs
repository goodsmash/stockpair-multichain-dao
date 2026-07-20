#!/usr/bin/env node
import { RobinhoodChainKitClient } from '../src/index.js'

function usage() {
  console.error('Usage: stockpair-robinhood <capabilities|network|contracts|aa|gas|node|finality|stock-token|message-plan|bridge-plan> --base-url <https://indexer> [--api-version 0.9.0] [options]\nRead-only: no signing, key storage, approval, or broadcasting.')
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

try {
  const { command, options } = parse(process.argv.slice(2))
  if (!options['base-url']) { usage(); process.exitCode = 2 }
  else {
    const client = new RobinhoodChainKitClient({ baseUrl: options['base-url'], expectedApiVersion: options['api-version'] })
    let result
    if (command === 'capabilities') result = await client.getCapabilities()
    else if (command === 'network') result = await client.getNetwork()
    else if (command === 'contracts') result = await client.getContracts()
    else if (command === 'aa') result = await client.getAccountAbstraction()
    else if (command === 'gas') result = await client.getGas()
    else if (command === 'node') result = await client.getNodeProfile()
    else if (command === 'finality') result = await client.getFinality(options.tx)
    else if (command === 'stock-token' && options.token) result = await client.getStockTokenSnapshot(options.token, { feed: options.feed, sequencerFeed: options['sequencer-feed'], wallet: options.wallet, heartbeatSeconds: options.heartbeat, gracePeriodSeconds: options.grace })
    else if (command === 'message-plan') result = await client.getMessagingPlan({ direction: options.direction, target: options.target, data: options.data ?? '0x', from: options.from, l2CallValue: options.value ?? '0' })
    else if (command === 'bridge-plan') result = await client.getBridgePlan({ direction: options.direction, token: options.token })
    else { usage(); process.exitCode = 2 }
    if (result !== undefined) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
