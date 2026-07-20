import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getAddress, isAddress } from 'viem'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const ADDRESS = /^0x[0-9a-fA-F]{40}$/

function clean(value) {
  if (Array.isArray(value)) return value.map(clean)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clean(item)]))
}

function normalizeAddresses(value, trail = '') {
  if (Array.isArray(value)) return value.map((item, index) => normalizeAddresses(item, `${trail}[${index}]`))
  if (!value || typeof value !== 'object') {
    if (typeof value === 'string' && ADDRESS.test(value)) {
      if (!isAddress(value)) throw new Error(`invalid address in Robinhood registry at ${trail}`)
      return getAddress(value)
    }
    return value
  }
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalizeAddresses(item, trail ? `${trail}.${key}` : key)]))
}

export function loadRobinhoodRegistry(filename = 'integrations/robinhood/registry.json') {
  const resolved = path.isAbsolute(filename) ? filename : path.resolve(root, filename)
  const parsed = JSON.parse(fs.readFileSync(resolved, 'utf8'))
  if (parsed?.schemaVersion !== '1.0.0') throw new Error('unsupported Robinhood registry schema version')
  if (!parsed.networks?.['4663'] || !parsed.networks?.['46630']) throw new Error('Robinhood registry must contain mainnet and testnet')
  for (const [key, network] of Object.entries(parsed.networks)) {
    if (Number(key) !== network.chainId) throw new Error(`Robinhood registry chain key mismatch: ${key}`)
    if (!String(network.explorerUrl).startsWith('https://')) throw new Error(`Robinhood explorer must use HTTPS for chain ${key}`)
    if (!String(network.sequencerFeedUrl).startsWith('wss://')) throw new Error(`Robinhood sequencer feed must use WSS for chain ${key}`)
  }
  return Object.freeze(normalizeAddresses(clean(parsed)))
}

export function robinhoodNetwork(registry, chainId) {
  return registry.networks?.[String(chainId)] ?? null
}
