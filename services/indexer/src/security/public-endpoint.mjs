const OFFICIAL_SHARED_HOSTS = new Set([
  'rpc.mainnet.chain.robinhood.com',
  'rpc.testnet.chain.robinhood.com'
])

function parsedEndpoint(value) {
  try { return new URL(value) } catch { return null }
}

function isLoopbackHost(hostname) {
  const host = String(hostname ?? '').toLowerCase().replace(/^\[|\]$/g, '')
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.localhost')
}

export function publicEndpointLabel(value) {
  const parsed = parsedEndpoint(value)
  if (!parsed) return 'invalid-endpoint'
  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (isLoopbackHost(hostname) || OFFICIAL_SHARED_HOSTS.has(hostname)) {
    return `${parsed.protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''}`
  }
  return `${parsed.protocol}//configured-provider`
}

export function publicEndpointMetadata(value) {
  const parsed = parsedEndpoint(value)
  if (!parsed) return { configured: false, transport: null, loopback: false, label: 'invalid-endpoint' }
  return {
    configured: true,
    transport: parsed.protocol.replace(/:$/, ''),
    loopback: isLoopbackHost(parsed.hostname),
    label: publicEndpointLabel(value)
  }
}
