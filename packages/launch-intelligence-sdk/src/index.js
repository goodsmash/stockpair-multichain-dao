const MAX_RESPONSE_BYTES = 2_000_000
const MAX_EVENT_BYTES = 256_000
const DEFAULT_API_VERSION = '0.9.0'

function apiVersion(value) {
  const text = String(value ?? DEFAULT_API_VERSION)
  if (!/^\d+\.\d+\.\d+$/.test(text)) throw new Error('expectedApiVersion must be an exact semantic version')
  return text
}

async function readJson(response, expectedApiVersion) {
  const actualApiVersion = response.headers.get('x-stockpair-api-version')
  if (actualApiVersion !== expectedApiVersion) {
    throw new Error(`indexer API mismatch: expected ${expectedApiVersion}, received ${actualApiVersion ?? 'missing'}`)
  }
  const contentType = String(response.headers.get('content-type') ?? '').toLowerCase()
  if (!contentType.startsWith('application/json')) throw new Error('indexer returned an unexpected content type')
  const length = Number(response.headers.get('content-length') ?? 0)
  if (!Number.isFinite(length) || length < 0 || length > MAX_RESPONSE_BYTES) throw new Error('response exceeds SDK limit')
  const text = await response.text()
  if (text.length > MAX_RESPONSE_BYTES) throw new Error('response exceeds SDK limit')
  let value
  try { value = JSON.parse(text) } catch { throw new Error('indexer returned invalid JSON') }
  if (!response.ok) throw new Error(value?.error ?? `request failed: ${response.status}`)
  return value
}

function baseUrl(value) {
  const parsed = new URL(value)
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error('invalid indexer URL')
  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  const loopback = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname.endsWith('.localhost')
  if (parsed.protocol !== 'https:' && !loopback) throw new Error('non-loopback indexer URLs must use HTTPS')
  return parsed.toString().replace(/\/$/, '')
}

export class StockPairLaunchIntelligenceClient {
  constructor(options) {
    if (!options || typeof options !== 'object') throw new Error('client options are required')
    this.baseUrl = baseUrl(options.baseUrl)
    this.expectedApiVersion = apiVersion(options.expectedApiVersion)
    this.fetch = options.fetch ?? globalThis.fetch
    this.apiVerified = false
    if (typeof this.fetch !== 'function') throw new Error('fetch implementation is required')
  }

  async request(path) {
    const value = await readJson(await this.fetch(`${this.baseUrl}${path}`, { headers: { accept: 'application/json' } }), this.expectedApiVersion)
    this.apiVerified = true
    return value
  }

  async getSources() {
    return this.request('/api/radar/sources')
  }

  async getCandidates(query = {}) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
    const queryString = params.size ? `?${params}` : ''
    return this.request(`/api/radar/candidates${queryString}`)
  }

  async getAlerts(query = {}) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
    const queryString = params.size ? `?${params}` : ''
    return this.request(`/api/radar/alerts${queryString}`)
  }

  subscribe(onEvent, options = {}) {
    if (!this.apiVerified) throw new Error('verify the indexer API with a read request before subscribing')
    if (typeof onEvent !== 'function') throw new Error('onEvent callback is required')
    if (typeof EventSource === 'undefined') throw new Error('EventSource is unavailable; provide an environment-specific SSE client')
    const stream = new EventSource(`${this.baseUrl}/api/stream`, { withCredentials: options.withCredentials === true })
    const listener = (event) => {
      if (typeof event.data !== 'string' || event.data.length > MAX_EVENT_BYTES) return
      try { onEvent(JSON.parse(event.data)) } catch { /* ignore malformed event */ }
    }
    stream.addEventListener('scout', listener)
    return () => stream.close()
  }
}
