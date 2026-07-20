const MAX_RESPONSE_BYTES = 2_000_000
const DEFAULT_API_VERSION = '0.9.0'

function apiVersion(value) {
  const text = String(value ?? DEFAULT_API_VERSION)
  if (!/^\d+\.\d+\.\d+$/.test(text)) throw new Error('expectedApiVersion must be an exact semantic version')
  return text
}

function safeBaseUrl(value) {
  const parsed = new URL(value)
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error('invalid indexer URL')
  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  const loopback = ['localhost', '127.0.0.1', '::1'].includes(hostname) || hostname.endsWith('.localhost')
  if (parsed.protocol !== 'https:' && !loopback) throw new Error('non-loopback indexer URLs must use HTTPS')
  return parsed.toString().replace(/\/$/, '')
}

async function readJson(response, expectedApiVersion) {
  const actualApiVersion = response.headers.get('x-stockpair-api-version')
  if (actualApiVersion !== expectedApiVersion) {
    throw new Error(`indexer API mismatch: expected ${expectedApiVersion}, received ${actualApiVersion ?? 'missing'}`)
  }
  const contentType = String(response.headers.get('content-type') ?? '').toLowerCase()
  if (!contentType.startsWith('application/json')) throw new Error('indexer returned an unexpected content type')
  const declared = Number(response.headers.get('content-length') ?? 0)
  if (!Number.isFinite(declared) || declared < 0 || declared > MAX_RESPONSE_BYTES) throw new Error('response exceeds SDK limit')
  const text = await response.text()
  if (text.length > MAX_RESPONSE_BYTES) throw new Error('response exceeds SDK limit')
  let value
  try { value = JSON.parse(text) } catch { throw new Error('indexer returned invalid JSON') }
  if (!response.ok) throw new Error(value?.error ?? `request failed: ${response.status}`)
  return value
}

function decimalString(value, name) {
  const text = String(value)
  if (!/^\d+$/.test(text)) throw new Error(`${name} must be an unsigned integer string`)
  return text
}

export function scaleRawToShares(rawAmount, uiMultiplier) {
  return ((BigInt(decimalString(rawAmount, 'rawAmount')) * BigInt(decimalString(uiMultiplier, 'uiMultiplier'))) / 10n ** 18n).toString()
}

export function deriveUnderlyingSharePrice(tokenPrice, uiMultiplier) {
  const multiplier = BigInt(decimalString(uiMultiplier, 'uiMultiplier'))
  if (multiplier === 0n) throw new Error('uiMultiplier must be non-zero')
  return ((BigInt(decimalString(tokenPrice, 'tokenPrice')) * 10n ** 18n) / multiplier).toString()
}

export function assessOracleSnapshot(input = {}) {
  const blockers = []
  const answer = BigInt(String(input.answer ?? '0'))
  const updatedAt = Number(input.updatedAt ?? 0)
  const heartbeatSeconds = Number(input.heartbeatSeconds ?? 0)
  const nowSeconds = Number(input.nowSeconds ?? Math.floor(Date.now() / 1000))
  const sequencerUp = input.sequencerUp === true
  const sequencerStartedAt = Number(input.sequencerStartedAt ?? 0)
  const gracePeriodSeconds = Number(input.gracePeriodSeconds ?? 3600)
  const oraclePaused = input.oraclePaused === true
  if (answer <= 0n) blockers.push('oracle answer is not positive')
  if (!Number.isFinite(updatedAt) || updatedAt <= 0) blockers.push('oracle round is incomplete')
  if (!Number.isFinite(heartbeatSeconds) || heartbeatSeconds <= 0) blockers.push('heartbeat is not configured')
  else if (nowSeconds - updatedAt > heartbeatSeconds) blockers.push('oracle answer is stale')
  if (!sequencerUp) blockers.push('sequencer is down or unknown')
  if (!Number.isFinite(sequencerStartedAt) || nowSeconds - sequencerStartedAt <= gracePeriodSeconds) blockers.push('sequencer recovery grace period has not elapsed')
  if (oraclePaused) blockers.push('oracle is paused for a corporate action')
  return { eligible: blockers.length === 0, blockers }
}

export class RobinhoodChainKitClient {
  constructor(options) {
    if (!options || typeof options !== 'object') throw new Error('client options are required')
    this.baseUrl = safeBaseUrl(options.baseUrl)
    this.expectedApiVersion = apiVersion(options.expectedApiVersion)
    this.fetch = options.fetch ?? globalThis.fetch
    if (typeof this.fetch !== 'function') throw new Error('fetch implementation is required')
  }

  async request(path) {
    return readJson(await this.fetch(`${this.baseUrl}${path}`, { headers: { accept: 'application/json' } }), this.expectedApiVersion)
  }

  getCapabilities() { return this.request('/api/robinhood/capabilities') }
  getNetwork() { return this.request('/api/robinhood/network') }
  getContracts() { return this.request('/api/robinhood/contracts') }
  getAccountAbstraction() { return this.request('/api/robinhood/account-abstraction') }
  getGas() { return this.request('/api/robinhood/gas') }
  getNodeProfile() { return this.request('/api/robinhood/node') }
  getFinality(transactionHash) {
    const query = transactionHash ? `?transactionHash=${encodeURIComponent(transactionHash)}` : ''
    return this.request(`/api/robinhood/finality${query}`)
  }
  getStockTokenSnapshot(token, options = {}) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(options)) if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
    const query = params.size ? `?${params}` : ''
    return this.request(`/api/robinhood/stock-token/${encodeURIComponent(token)}${query}`)
  }
  getMessagingPlan(options) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(options ?? {})) if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
    return this.request(`/api/robinhood/messaging-plan?${params}`)
  }
  getBridgePlan(options) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(options ?? {})) if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
    return this.request(`/api/robinhood/bridge-plan?${params}`)
  }
}
