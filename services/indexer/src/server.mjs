import http from 'node:http'
import { isIP } from 'node:net'
import { isAddress } from 'viem'
import { loadConfig } from './config.mjs'
import { createIndexer } from './indexer.mjs'
import { createChainScout } from './scout.mjs'
import { createLaunchRadar } from './intelligence/radar.mjs'
import { createReputationEngine } from './intelligence/reputation.mjs'
import { createAlertDelivery } from './alerts/delivery.mjs'
import { createProtocolAlertMonitor } from './alerts/protocol-monitor.mjs'
import { loadRobinhoodRegistry } from './robinhood/registry.mjs'
import { createRobinhoodNativeIntegration } from './robinhood/native-integration.mjs'

const config = loadConfig()
const indexer = createIndexer(config)
const scout = createChainScout(config)
const radar = createLaunchRadar({ scout, policy: config.launchRadarPolicy, alertRules: config.launchAlertRules })
const reputation = createReputationEngine({ scout })
const alertDelivery = createAlertDelivery(config)
const robinhoodRegistry = loadRobinhoodRegistry(config.robinhoodRegistryFile)
const robinhood = createRobinhoodNativeIntegration({ client: indexer.client, config, registry: robinhoodRegistry })
let protocolAlertMonitor
const buckets = new Map()
const cache = new Map()
const streams = new Set()
const streamsByIp = new Map()
const MAX_CACHE_ENTRIES = 5_000
const SAFE_SCOUT_STATUSES = new Set(['trusted', 'low', 'caution', 'danger', 'blocked'])
const SAFE_RADAR_STAGES = new Set(['detected', 'curve', 'pooled', 'graduated', 'active'])
const SAFE_DAO_STATUSES = new Set(['unknown', 'too-new', 'active-evidence', 'watch', 'dormant-candidate'])
const SAFE_DAO_ROLES = new Set(['governor', 'timelock', 'multisig-treasury', 'governance-token-or-votes-module', 'role-managed-governance-component'])

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status }
}

function queryInteger(url, name, fallback, min, max) {
  const raw = url.searchParams.get(name)
  if (raw === null || raw === '') return fallback
  if (!/^\d{1,15}$/.test(raw)) throw new HttpError(400, `${name} must be an integer`)
  const value = Number(raw)
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new HttpError(400, `${name} must be between ${min} and ${max}`)
  return value
}

function queryText(url, name, max = 160) {
  const raw = url.searchParams.get(name)
  if (raw === null || raw === '') return undefined
  if (raw.length > max || /[\u0000-\u001f\u007f]/.test(raw)) throw new HttpError(400, `${name} is invalid`)
  return raw
}

function queryEnum(url, name, allowed) {
  const value = queryText(url, name, 40)
  if (value === undefined) return undefined
  if (!allowed.has(value.toLowerCase())) throw new HttpError(400, `${name} is not supported`)
  return value.toLowerCase()
}

function queryAddress(url, name, required = false) {
  const value = queryText(url, name, 80)
  if (value === undefined) { if (required) throw new HttpError(400, `${name} is required`); return undefined }
  if (!isAddress(value)) throw new HttpError(400, `${name} must be a valid address`)
  return value
}

function queryHash(url, name) {
  const value = queryText(url, name, 80)
  if (value === undefined) return null
  if (!/^0x[0-9a-fA-F]{64}$/.test(value)) throw new HttpError(400, `${name} must be a 32-byte hash`)
  return value.toLowerCase()
}

function queryHexData(url, name, fallback = '0x') {
  const value = url.searchParams.get(name) ?? fallback
  if (value.length > 131_074 || !/^0x(?:[0-9a-fA-F]{2})*$/.test(value)) throw new HttpError(400, `${name} must be bounded even-length hex data`)
  return value.toLowerCase()
}

function securityHeaders(contentType = 'application/json; charset=utf-8') {
  return {
    'content-type': contentType,
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'x-robots-tag': 'noindex, nofollow, noarchive',
    'referrer-policy': 'no-referrer',
    'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=()',
    'cross-origin-opener-policy': 'same-origin',
    'cross-origin-resource-policy': 'cross-origin',
    'x-stockpair-api-version': '0.9.0',
    'content-security-policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
  }
}

function corsHeaders(req) {
  const origin = req.headers.origin
  if (!origin || !config.allowedOrigins.includes(origin)) return {}
  return { 'access-control-allow-origin': origin, vary: 'Origin', 'access-control-allow-methods': 'GET,OPTIONS', 'access-control-allow-headers': 'content-type,last-event-id' }
}

function send(req, res, status, data, extra = {}) {
  if (status === 204) {
    res.writeHead(status, { ...securityHeaders(), ...corsHeaders(req), ...extra })
    return res.end()
  }
  const body = JSON.stringify(data, (_, value) => typeof value === 'bigint' ? value.toString() : value)
  res.writeHead(status, { ...securityHeaders(), ...corsHeaders(req), 'content-length': Buffer.byteLength(body), ...extra })
  res.end(body)
}

let lastBucketSweep = Date.now()
function normalizeIp(value) {
  return String(value ?? 'unknown').replace(/^::ffff:/, '')
}

function clientIp(req) {
  const remote = normalizeIp(req.socket.remoteAddress)
  if (!config.trustProxy || !config.trustedProxyIps.has(remote)) return remote
  const chain = String(req.headers['x-forwarded-for'] ?? '').split(',').map((item) => normalizeIp(item.trim())).filter((item) => isIP(item))
  if (!chain.length) return remote
  let candidate = remote
  for (let index = chain.length - 1; index >= 0; index -= 1) {
    if (!config.trustedProxyIps.has(candidate)) break
    candidate = chain[index]
  }
  return candidate
}

function requestHostname(req) {
  const raw = String(req.headers.host ?? '').trim()
  if (!raw || raw.length > 255 || /[\s/@]/.test(raw)) return null
  try { return new URL(`http://${raw}`).hostname.toLowerCase().replace(/^\[|\]$/g, '') } catch { return null }
}

function hostAllowed(req) {
  const hostname = requestHostname(req)
  return Boolean(hostname && config.allowedHosts.includes(hostname))
}

function originAllowed(req) {
  const origin = req.headers.origin
  return !origin || config.allowedOrigins.includes(origin)
}

function rateLimited(req) {
  const now = Date.now()
  if (now - lastBucketSweep > 60_000) {
    const activeMinute = Math.floor(now / 60_000)
    for (const [key, value] of buckets) if (value.minute < activeMinute - 1) buckets.delete(key)
    lastBucketSweep = now
  }
  const ip = clientIp(req)
  const minute = Math.floor(now / 60_000)
  const current = buckets.get(ip)
  if (!current || current.minute !== minute) {
    buckets.set(ip, { minute, count: 1 })
    return false
  }
  current.count += 1
  return current.count > config.requestLimitPerMinute
}

function pruneCache() {
  const now = Date.now()
  for (const [key, value] of cache) if (value.expires <= now) cache.delete(key)
  while (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value)
}

async function cached(key, ttlMs, loader) {
  const current = cache.get(key)
  if (current && current.expires > Date.now()) return current.value
  const value = await loader()
  if (cache.size >= MAX_CACHE_ENTRIES) pruneCache()
  cache.set(key, { expires: Date.now() + ttlMs, value })
  return value
}

function queryObject(url) {
  return {
    limit: queryInteger(url, 'limit', 100, 1, 500),
    chainId: url.searchParams.has('chainId') ? queryInteger(url, 'chainId', 0, 1, Number.MAX_SAFE_INTEGER) : undefined,
    status: queryEnum(url, 'status', SAFE_SCOUT_STATUSES),
    q: queryText(url, 'q', 160)
  }
}

function radarQuery(url) {
  return {
    limit: queryInteger(url, 'limit', 100, 1, 500),
    chainId: url.searchParams.has('chainId') ? queryInteger(url, 'chainId', 0, 1, Number.MAX_SAFE_INTEGER) : undefined,
    stage: queryEnum(url, 'stage', SAFE_RADAR_STAGES),
    minScore: url.searchParams.has('minScore') ? queryInteger(url, 'minScore', 0, 0, 100) : undefined,
    maxRiskScore: url.searchParams.has('maxRiskScore') ? queryInteger(url, 'maxRiskScore', 100, 0, 100) : undefined,
    q: queryText(url, 'q', 160)
  }
}

function daoQuery(url) {
  return {
    limit: queryInteger(url, 'limit', 100, 1, 500),
    chainId: url.searchParams.has('chainId') ? queryInteger(url, 'chainId', 0, 1, Number.MAX_SAFE_INTEGER) : undefined,
    status: queryEnum(url, 'status', SAFE_DAO_STATUSES),
    role: queryEnum(url, 'role', SAFE_DAO_ROLES),
    q: queryText(url, 'q', 160)
  }
}

function clampScore(value) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.min(100, Math.round(number))) : 100
}

function auditorStatus(score, unavailable = false) {
  if (unavailable) return 'unknown'
  if (score >= 70) return 'danger'
  if (score >= 45) return 'caution'
  return 'pass'
}

async function enrichedTokenScan(token) {
  const base = await indexer.scanToken(token)
  const address = base.address.toLowerCase()
  const contract = scout.contract(config.chainId, base.address)
  const pools = scout.poolsForToken(config.chainId, base.address)
  const activePools = pools.filter((item) => item.market?.hasLiquidity === true)
  const verifiedActivePools = activePools.filter((item) => item.verifiedFactory === true)
  const poolAddresses = new Set(pools.map((item) => item.pool.toLowerCase()))
  const swaps = scout.swapsForPools(config.chainId, poolAddresses)
  const manipulation = pools.map((item) => reputation.manipulation(config.chainId, item.pool)).filter(Boolean)
  const highestManipulation = manipulation.sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0))[0] ?? null
  const deployerReputation = contract?.deployer ? reputation.deployer(config.chainId, contract.deployer) : null

  const staticScore = clampScore(base.score)
  const sourceScore = base.explorer?.changedBytecode === true ? 100 : base.explorer?.verified === false ? 55 : base.explorer?.verified === true ? 5 : 35
  const ownershipScore = base.metadata?.paused === true ? 95 : base.proxy?.implementation || base.proxy?.admin || base.proxy?.beacon ? 80 : base.metadata?.owner ? 35 : 10
  const concentration = Number(base.explorer?.holderConcentration)
  const distributionUnavailable = !Number.isFinite(concentration)
  const distributionScore = distributionUnavailable ? 50 : clampScore(concentration * 100)
  const liquidityScore = verifiedActivePools.length ? 5 : activePools.length ? 35 : pools.length ? 70 : 100
  const flowUnavailable = manipulation.length === 0
  const flowScore = flowUnavailable ? 50 : clampScore(highestManipulation?.score)
  const weights = [
    [staticScore, 0.35], [sourceScore, 0.12], [ownershipScore, 0.16],
    [distributionScore, 0.12], [liquidityScore, 0.17], [flowScore, 0.08]
  ]
  const intelligenceRiskScore = clampScore(weights.reduce((sum, [score, weight]) => sum + score * weight, 0))
  const evidenceConfidence = verifiedActivePools.length && base.explorer?.verified === true && !distributionUnavailable && !flowUnavailable
    ? 'high'
    : pools.length || contract ? 'medium' : 'low'

  return {
    ...base,
    intelligence: {
      riskScore: intelligenceRiskScore,
      status: auditorStatus(intelligenceRiskScore),
      confidence: evidenceConfidence,
      generatedAt: new Date().toISOString(),
      auditors: [
        { id: 'bytecode', label: 'Runtime bytecode', score: staticScore, status: auditorStatus(staticScore), evidence: base.findings?.slice(0, 12) ?? [] },
        { id: 'source', label: 'Source and runtime integrity', score: sourceScore, status: auditorStatus(sourceScore), verified: base.explorer?.verified ?? null, changedBytecode: base.explorer?.changedBytecode ?? null },
        { id: 'control', label: 'Ownership, pause and proxy controls', score: ownershipScore, status: auditorStatus(ownershipScore), owner: base.metadata?.owner ?? null, paused: base.metadata?.paused ?? null, proxy: base.proxy },
        { id: 'distribution', label: 'Holder concentration', score: distributionScore, status: auditorStatus(distributionScore, distributionUnavailable), concentration: distributionUnavailable ? null : concentration, holdersCount: base.explorer?.holdersCount ?? null },
        { id: 'liquidity', label: 'Observed liquidity', score: liquidityScore, status: auditorStatus(liquidityScore), pools: pools.length, activePools: activePools.length, verifiedActivePools: verifiedActivePools.length },
        { id: 'flow', label: 'Manipulation heuristics', score: flowScore, status: auditorStatus(flowScore, flowUnavailable), observedSwaps: swaps.length, highestSignal: highestManipulation }
      ],
      limitation: 'This evidence panel combines independent deterministic checks. It is not an AI guarantee, audit opinion, identity attribution or proof that a token cannot rug, tax, block sales or lose liquidity.'
    },
    provenance: {
      indexedContract: contract,
      deployerReputation,
      continuousCoverage: scout.summary().coverage.find((item) => item.chainId === config.chainId) ?? null
    },
    market: {
      pools: pools.map((item) => ({
        pool: item.pool,
        standard: item.standard,
        factory: item.factory,
        factoryName: item.factoryName,
        verifiedFactory: item.verifiedFactory,
        token0: item.token0,
        token1: item.token1,
        token0Meta: item.token0Meta,
        token1Meta: item.token1Meta,
        fee: item.fee,
        swapCount: item.swapCount,
        lastSwapAt: item.lastSwapAt,
        market: item.market
      })),
      poolCount: pools.length,
      activePoolCount: activePools.length,
      verifiedActivePoolCount: verifiedActivePools.length,
      observedSwapCount: swaps.length,
      hasObservedLiquidity: activePools.length > 0,
      hasVerifiedObservedLiquidity: verifiedActivePools.length > 0,
      manipulation
    }
  }
}

function removeStream(client) {
  if (!client || !streams.delete(client)) return
  const remaining = Math.max(0, (streamsByIp.get(client.ip) ?? 1) - 1)
  if (remaining === 0) streamsByIp.delete(client.ip)
  else streamsByIp.set(client.ip, remaining)
  if (!client.res.writableEnded) client.res.end()
}

function writeStream(client, payload) {
  try {
    if (client.res.writableEnded || !client.res.write(payload)) {
      removeStream(client)
      return false
    }
    return true
  } catch {
    removeStream(client)
    return false
  }
}

function openStream(req, res) {
  if (!originAllowed(req)) return send(req, res, 403, { error: 'Origin not allowed' })
  const ip = clientIp(req)
  const currentForIp = streamsByIp.get(ip) ?? 0
  if (streams.size >= config.maxSseConnections || currentForIp >= config.maxSsePerIp) {
    return send(req, res, 429, { error: 'SSE connection limit exceeded' }, { 'retry-after': '30' })
  }
  res.writeHead(200, {
    ...securityHeaders('text/event-stream; charset=utf-8'),
    ...corsHeaders(req),
    connection: 'keep-alive',
    'cache-control': 'no-cache, no-transform',
    'x-accel-buffering': 'no'
  })
  const client = { res, ip }
  if (!res.write(`event: ready\ndata: ${JSON.stringify(scout.summary())}\n\n`)) return res.end()
  streams.add(client)
  streamsByIp.set(ip, currentForIp + 1)
  const heartbeat = setInterval(() => {
    if (!res.writableEnded) writeStream(client, ': heartbeat\n\n')
  }, 20_000)
  heartbeat.unref?.()
  req.on('close', () => {
    clearInterval(heartbeat)
    removeStream(client)
  })
}

function publishEvent(event) {
  alertDelivery.enqueue(event)
  const payload = `id: ${event.id}\nevent: scout\ndata: ${JSON.stringify(event)}\n\n`
  for (const client of [...streams]) writeStream(client, payload)
}

const removeScoutListener = scout.onEvent(publishEvent)
protocolAlertMonitor = createProtocolAlertMonitor({ indexer, config, onEvent: publishEvent })

const server = http.createServer(async (req, res) => {
  if (!hostAllowed(req)) return send(req, res, 421, { error: 'Host not allowed' })
  if (!originAllowed(req)) return send(req, res, 403, { error: 'Origin not allowed' })
  if (req.method === 'OPTIONS') return send(req, res, 204, null)
  if (req.method !== 'GET') return send(req, res, 405, { error: 'Method not allowed' }, { allow: 'GET,OPTIONS' })
  if (rateLimited(req)) return send(req, res, 429, { error: 'Rate limit exceeded' })
  if ((req.url?.length ?? 0) > 2_048) return send(req, res, 414, { error: 'Request URI too long' })

  const url = new URL(req.url ?? '/', 'http://localhost')
  try {
    if (url.pathname === '/health') {
      const state = await cached('network', 3_000, () => indexer.network())
      return send(req, res, 200, { ok: true, service: 'stockpair-indexer', version: '0.9.0', scout: scout.summary(), alertDelivery: alertDelivery.status(), protocolAlerts: protocolAlertMonitor.status(), ...state })
    }
    if (url.pathname === '/api/config') {
      const factoryTrust = await cached('factory-trust', 3_000, () => indexer.factoryTrust())
      return send(req, res, 200, {
        chainId: config.chainId,
        network: config.network,
        explorerUrl: config.explorerUrl,
        launchpadAddress: config.launchpadAddress,
        launchpadCodeHash: config.launchpadCodeHash,
        protocolVersion: config.protocolVersion,
        factoryTrust,
        productionTradingEnabled: config.productionTradingEnabled && factoryTrust.trusted,
        requireExplorerVerification: config.requireExplorerVerification,
        scoutEnabled: config.scoutEnabled,
        scoutCoverage: scout.summary().coverage
      })
    }
    if (url.pathname === '/api/stream') return openStream(req, res)
    if (url.pathname === '/api/network') return send(req, res, 200, await cached('network', 3_000, () => indexer.network()))
    if (url.pathname === '/api/launchpad') return send(req, res, 200, await cached('launchpad', 3_000, () => indexer.launchpadState()))
    if (url.pathname === '/api/stocks') return send(req, res, 200, await cached('stocks', 15_000, () => indexer.stocks()))
    if (url.pathname === '/api/launches') {
      const limit = queryInteger(url, 'limit', 40, 1, 100)
      return send(req, res, 200, await cached(`launches:${limit}`, 5_000, () => indexer.launches(limit)))
    }
    if (url.pathname === '/api/activity') {
      const blocks = queryInteger(url, 'blocks', config.eventLookbackBlocks, 100, 250_000)
      return send(req, res, 200, await cached(`activity:${blocks}`, 5_000, () => indexer.activity(blocks)))
    }
    if (url.pathname.startsWith('/api/scan/')) {
      const token = decodeURIComponent(url.pathname.slice('/api/scan/'.length))
      if (!isAddress(token)) return send(req, res, 400, { error: 'Invalid token address' })
      return send(req, res, 200, await cached(`scan:${token.toLowerCase()}`, 15_000, () => enrichedTokenScan(token)))
    }
    if (url.pathname.startsWith('/api/portfolio/')) {
      const wallet = decodeURIComponent(url.pathname.slice('/api/portfolio/'.length))
      if (!isAddress(wallet)) return send(req, res, 400, { error: 'Invalid wallet address' })
      return send(req, res, 200, await cached(`portfolio:${wallet.toLowerCase()}`, 5_000, () => indexer.portfolio(wallet)))
    }

    if (url.pathname === '/api/radar/sources') return send(req, res, 200, radar.sources())
    if (url.pathname === '/api/radar/candidates') return send(req, res, 200, radar.snapshot(radarQuery(url)))
    if (url.pathname === '/api/radar/alerts') return send(req, res, 200, radar.alerts(radarQuery(url)))
    if (url.pathname === '/api/radar/opportunities') return send(req, res, 200, radar.opportunities(radarQuery(url)))
    if (url.pathname === '/api/radar/deployer-reputation') {
      const chainId = queryInteger(url, 'chainId', config.chainId, 1, Number.MAX_SAFE_INTEGER)
      const address = queryAddress(url, 'address', true)
      const result = reputation.deployer(chainId, address)
      return send(req, res, result ? 200 : 404, result ?? { error: 'Deployer evidence unavailable' })
    }
    if (url.pathname === '/api/radar/manipulation') {
      const chainId = queryInteger(url, 'chainId', config.chainId, 1, Number.MAX_SAFE_INTEGER)
      const pool = queryAddress(url, 'pool', true)
      const result = reputation.manipulation(chainId, pool)
      return send(req, res, result ? 200 : 404, result ?? { error: 'Pool evidence unavailable' })
    }
    if (url.pathname === '/api/alerts/status') return send(req, res, 200, { delivery: alertDelivery.status(), protocol: protocolAlertMonitor.status() })

    if (url.pathname === '/api/robinhood/capabilities') return send(req, res, 200, robinhood.capabilities())
    if (url.pathname === '/api/robinhood/network') return send(req, res, 200, robinhood.network())
    if (url.pathname === '/api/robinhood/contracts') return send(req, res, 200, robinhood.contracts())
    if (url.pathname === '/api/robinhood/account-abstraction') return send(req, res, 200, robinhood.accountAbstraction())
    if (url.pathname === '/api/robinhood/gas') return send(req, res, 200, await robinhood.gas())
    if (url.pathname === '/api/robinhood/finality') return send(req, res, 200, await robinhood.finality(queryHash(url, 'transactionHash')))
    if (url.pathname === '/api/robinhood/messaging-plan') {
      const direction = queryEnum(url, 'direction', new Set(['l1-to-l2', 'l2-to-l1']))
      if (!direction) throw new HttpError(400, 'direction is required')
      const l2CallValue = queryText(url, 'l2CallValue', 100) ?? '0'
      if (!/^\d{1,100}$/.test(l2CallValue)) throw new HttpError(400, 'l2CallValue must be an unsigned integer string')
      return send(req, res, 200, robinhood.messagePlan({ direction, target: queryAddress(url, 'target', true), data: queryHexData(url, 'data'), from: queryAddress(url, 'from'), l2CallValue }))
    }
    if (url.pathname === '/api/robinhood/bridge-plan') {
      const direction = queryEnum(url, 'direction', new Set(['l1-to-l2', 'l2-to-l1'])) ?? 'l1-to-l2'
      return send(req, res, 200, robinhood.bridgePlan({ direction, token: queryAddress(url, 'token') }))
    }
    if (url.pathname === '/api/robinhood/node') return send(req, res, 200, robinhood.node())
    if (url.pathname.startsWith('/api/robinhood/stock-token/')) {
      const token = decodeURIComponent(url.pathname.slice('/api/robinhood/stock-token/'.length))
      if (!isAddress(token)) throw new HttpError(400, 'token must be a valid address')
      return send(req, res, 200, await robinhood.stockTokenSnapshot({
        token,
        feed: queryAddress(url, 'feed'),
        sequencerFeed: queryAddress(url, 'sequencerFeed'),
        wallet: queryAddress(url, 'wallet'),
        heartbeatSeconds: url.searchParams.has('heartbeatSeconds') ? queryInteger(url, 'heartbeatSeconds', 0, 1, 604_800) : undefined,
        gracePeriodSeconds: url.searchParams.has('gracePeriodSeconds') ? queryInteger(url, 'gracePeriodSeconds', 3_600, 0, 86_400) : undefined
      }))
    }

    if (url.pathname === '/api/scout/summary') return send(req, res, 200, scout.summary())
    if (url.pathname === '/api/scout/chains') return send(req, res, 200, { generatedAt: new Date().toISOString(), chains: scout.chains() })
    if (url.pathname === '/api/scout/contracts') return send(req, res, 200, scout.contracts(queryObject(url)))
    if (url.pathname === '/api/scout/tokens') return send(req, res, 200, scout.tokens(queryObject(url)))
    if (url.pathname === '/api/scout/pools') return send(req, res, 200, scout.pools(queryObject(url)))
    if (url.pathname === '/api/scout/swaps') return send(req, res, 200, scout.swaps(queryObject(url)))
    if (url.pathname === '/api/scout/pending') return send(req, res, 200, scout.pending(queryObject(url)))
    if (url.pathname === '/api/scout/wallet-activity') return send(req, res, 200, scout.walletActivity(queryObject(url)))
    if (url.pathname === '/api/scout/events') return send(req, res, 200, scout.events(queryObject(url)))
    if (url.pathname === '/api/scout/labels') return send(req, res, 200, scout.labels())
    if (url.pathname === '/api/scout/daos') return send(req, res, 200, scout.daos(daoQuery(url)))
    if (url.pathname.startsWith('/api/scout/dao/')) {
      const parts = url.pathname.split('/').filter(Boolean)
      const chainId = Number(parts[3])
      const address = decodeURIComponent(parts[4] ?? '')
      if (!Number.isSafeInteger(chainId) || !isAddress(address)) return send(req, res, 400, { error: 'Invalid chain or DAO address' })
      const result = scout.dao(chainId, address)
      return send(req, res, result ? 200 : 404, result ?? { error: 'DAO candidate not indexed' })
    }
    if (url.pathname.startsWith('/api/scout/scan/')) {
      const parts = url.pathname.split('/').filter(Boolean)
      const chainId = Number(parts[3])
      const address = decodeURIComponent(parts[4] ?? '')
      if (!Number.isSafeInteger(chainId) || !isAddress(address)) return send(req, res, 400, { error: 'Invalid chain or contract address' })
      return send(req, res, 200, await cached(`multichain-scan:${chainId}:${address.toLowerCase()}`, 15_000, () => scout.scanAddress(chainId, address)))
    }
    if (url.pathname.startsWith('/api/scout/deployer/')) {
      const parts = url.pathname.split('/').filter(Boolean)
      const chainId = Number(parts[3])
      const address = decodeURIComponent(parts[4] ?? '')
      if (!Number.isSafeInteger(chainId) || !isAddress(address)) return send(req, res, 400, { error: 'Invalid chain or deployer address' })
      const result = scout.deployer(chainId, address)
      return send(req, res, result ? 200 : 404, result ?? { error: 'Deployer not indexed' })
    }
    if (url.pathname.startsWith('/api/scout/code/')) {
      const hash = decodeURIComponent(url.pathname.slice('/api/scout/code/'.length)).toLowerCase()
      if (!/^0x[0-9a-f]{64}$/.test(hash)) return send(req, res, 400, { error: 'Invalid code hash' })
      const result = scout.codeFamily(hash)
      return send(req, res, result ? 200 : 404, result ?? { error: 'Code family not indexed' })
    }
    return send(req, res, 404, { error: 'Not found' })
  } catch (error) {
    if (error instanceof HttpError) return send(req, res, error.status, { error: error.message })
    if (error instanceof URIError) return send(req, res, 400, { error: 'Invalid URL encoding' })
    console.error(error instanceof Error ? error.message : error)
    return send(req, res, 500, { error: 'Internal error' })
  }
})

server.requestTimeout = 20_000
server.headersTimeout = 10_000
server.keepAliveTimeout = 5_000
server.maxRequestsPerSocket = 1_000
server.listen(config.port, config.host, () => {
  scout.start()
  protocolAlertMonitor.start()
  console.log(`StockPair indexer listening on http://${config.host}:${config.port}`)
})

function shutdown() {
  scout.stop()
  removeScoutListener()
  protocolAlertMonitor.stop()
  alertDelivery.stop()
  for (const client of [...streams]) removeStream(client)
  streams.clear()
  streamsByIp.clear()
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(1), 5_000).unref()
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
