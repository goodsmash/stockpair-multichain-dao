import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isIP } from 'node:net'
import { defineChain, getAddress, isAddress, zeroAddress } from 'viem'

const moduleDir = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(moduleDir, '../../..')
const ZERO_HASH = `0x${'0'.repeat(64)}`

function intEnv(name, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = Number(process.env[name] ?? fallback)
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) throw new Error(`${name} must be an integer between ${min} and ${max}`)
  return parsed
}

function boolEnv(name, fallback = false) {
  const value = process.env[name]
  if (value === undefined) return fallback
  if (value === 'true') return true
  if (value === 'false') return false
  throw new Error(`${name} must be true or false`)
}

function safeUrl(value, name, protocols = ['http:', 'https:']) {
  const parsed = new URL(value)
  if (!protocols.includes(parsed.protocol)) throw new Error(`${name} must use ${protocols.join(' or ')}`)
  if (parsed.username || parsed.password) throw new Error(`${name} must not contain embedded credentials`)
  if (parsed.hash) throw new Error(`${name} must not contain a fragment`)
  return value.replace(/\/$/, '')
}

function safeOrigin(value, name) {
  const parsed = new URL(value)
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(`${name} must use http or https`)
  if (parsed.username || parsed.password) throw new Error(`${name} must not contain embedded credentials`)
  if (parsed.pathname !== '/' || parsed.search || parsed.hash) throw new Error(`${name} must be an origin without a path, query or fragment`)
  return parsed.origin
}

function isLoopbackOrigin(origin) {
  const host = new URL(origin).hostname.toLowerCase().replace(/^\[|\]$/g, '')
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.localhost')
}

function safeHostname(value, name) {
  const input = String(value ?? '').trim().toLowerCase()
  if (!input || input === '*') throw new Error(`${name} must be a concrete hostname or IP address`)
  if (input.includes('/') || input.includes('@') || input.includes('://')) throw new Error(`${name} must not contain a scheme, path or credentials`)
  if (isIP(input)) return input
  if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(input)) throw new Error(`${name} is not a valid hostname`)
  return input
}

function isLoopbackHost(host) {
  const normalized = String(host).toLowerCase().replace(/^\[|\]$/g, '')
  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1' || normalized.endsWith('.localhost')
}

function bytes32Env(name, fallback = ZERO_HASH) {
  const value = String(process.env[name] ?? fallback).toLowerCase()
  if (!/^0x[0-9a-f]{64}$/.test(value)) throw new Error(`${name} must be a 32-byte hex value`)
  return value
}

function readJsonFile(filename, fallback) {
  if (!filename) return fallback
  const resolved = path.isAbsolute(filename) ? filename : path.resolve(root, filename)
  if (!fs.existsSync(resolved)) return fallback
  return JSON.parse(fs.readFileSync(resolved, 'utf8'))
}

function parseJsonEnv(name, fallback) {
  const raw = process.env[name]
  return raw ? JSON.parse(raw) : fallback
}

function parseUrlList(value, name, protocols = ['http:', 'https:']) {
  const values = String(value ?? '').split(',').map((item) => item.trim()).filter(Boolean)
  return [...new Set(values.map((item, index) => safeUrl(item, `${name}[${index}]`, protocols)))]
}

function optionalBlock(value, name) {
  if (value === undefined || value === null || value === '') return null
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`${name} must be a non-negative safe integer`)
  return parsed
}

function integerField(value, name, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (value === undefined || value === null || value === '') return fallback
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) throw new Error(`${name} must be an integer between ${min} and ${max}`)
  return parsed
}

function normalizeScoutChains(primary) {
  const fileRows = readJsonFile(process.env.SCOUT_CHAINS_FILE ?? 'config/scout-chains.example.json', [])
  const envRows = parseJsonEnv('SCOUT_CHAINS_JSON', null)
  const source = Array.isArray(envRows) ? envRows : Array.isArray(fileRows) && fileRows.length ? fileRows : [primary]
  const seen = new Set()
  const rows = []
  for (const item of source) {
    if (item?.enabled === false) continue
    const chainId = Number(item.chainId)
    if (!Number.isSafeInteger(chainId) || chainId <= 0 || seen.has(chainId)) continue
    const rawRpcUrls = Array.isArray(item.rpcUrls) ? item.rpcUrls : [item.rpcUrl]
    const rpcUrls = [...new Set(rawRpcUrls.filter(Boolean).map((value, index) => safeUrl(String(value), `Scout RPC for chain ${chainId}[${index}]`)))]
    if (!rpcUrls.length) throw new Error(`Scout chain ${chainId} requires at least one RPC URL`)
    const rpcUrl = rpcUrls[0]
    const explorerUrl = item.explorerUrl ? safeUrl(String(item.explorerUrl), `Scout explorer for chain ${chainId}`) : null
    if (explorerUrl && new URL(explorerUrl).search) throw new Error(`Scout explorer for chain ${chainId} must not contain a query string`)
    const wsUrl = item.wsUrl ? safeUrl(String(item.wsUrl), `Scout WebSocket for chain ${chainId}`, ['ws:', 'wss:']) : null
    seen.add(chainId)
    rows.push({
      chainId,
      name: String(item.name ?? `Chain ${chainId}`).slice(0, 80),
      rpcUrl,
      rpcUrls,
      explorerUrl,
      wsUrl,
      startBlock: optionalBlock(item.startBlock, `Scout startBlock for chain ${chainId}`),
      confirmations: integerField(item.confirmations, `Scout confirmations for chain ${chainId}`, null, { min: 0, max: 128 }),
      expectedBlockTimeMs: integerField(item.expectedBlockTimeMs, `Scout expectedBlockTimeMs for chain ${chainId}`, 12_000, { min: 250, max: 3_600_000 }),
      stallAfterMs: integerField(item.stallAfterMs, `Scout stallAfterMs for chain ${chainId}`, null, { min: 5_000, max: 86_400_000 }),
      nativeCurrencyName: String(item.nativeCurrencyName ?? 'Ether').slice(0, 32),
      nativeCurrencySymbol: String(item.nativeCurrencySymbol ?? 'ETH').slice(0, 12)
    })
  }
  if (!rows.some((item) => item.chainId === primary.chainId)) rows.unshift(primary)
  return rows
}

function isPublicSharedRpc(url) {
  const hostname = new URL(url).hostname.toLowerCase()
  return hostname === 'rpc.mainnet.chain.robinhood.com' || hostname === 'rpc.testnet.chain.robinhood.com'
}

function optionalHttpsUrl(name, allowedHosts = null) {
  const raw = String(process.env[name] ?? '').trim()
  if (!raw) return null
  const value = safeUrl(raw, name, ['https:'])
  const parsed = new URL(value)
  if (allowedHosts && !allowedHosts.has(parsed.hostname.toLowerCase())) throw new Error(`${name} hostname is not allowed`)
  return value
}

function boundedSecret(name, minimum = 32) {
  const value = String(process.env[name] ?? '')
  if (!value) return ''
  if (value.length < minimum || value.length > 512 || /[\r\n]/.test(value)) throw new Error(`${name} must be ${minimum}-512 characters without line breaks`)
  return value
}

function uintStringEnv(name, fallback = '0') {
  const value = String(process.env[name] ?? fallback).trim()
  if (!/^\d{1,100}$/.test(value)) throw new Error(`${name} must be an unsigned integer string`)
  return value
}

export function loadConfig() {
  const chainId = intEnv('RH_CHAIN_ID', 46630, { min: 1 })
  const network = process.env.RH_CHAIN_NAME ?? (chainId === 4663 ? 'Robinhood Chain' : 'Robinhood Chain Testnet')
  const rpcUrl = safeUrl(process.env.RH_RPC_URL ?? (chainId === 4663
    ? 'https://rpc.mainnet.chain.robinhood.com'
    : 'https://rpc.testnet.chain.robinhood.com'), 'RH_RPC_URL')
  const explorerUrl = safeUrl(process.env.RH_EXPLORER_URL ?? (chainId === 4663
    ? 'https://robinhoodchain.blockscout.com'
    : 'https://explorer.testnet.chain.robinhood.com'), 'RH_EXPLORER_URL')
  if (new URL(explorerUrl).search) throw new Error('RH_EXPLORER_URL must not contain a query string')
  const wsUrl = process.env.RH_WS_URL ? safeUrl(process.env.RH_WS_URL, 'RH_WS_URL', ['ws:', 'wss:']) : null
  const rpcUrls = parseUrlList(process.env.RH_RPC_URLS, 'RH_RPC_URLS')
  if (!rpcUrls.includes(rpcUrl)) rpcUrls.unshift(rpcUrl)
  const rawLaunchpad = process.env.LAUNCHPAD_ADDRESS ?? zeroAddress
  const launchpadAddress = isAddress(rawLaunchpad) ? getAddress(rawLaunchpad) : zeroAddress
  const launchpadCodeHash = bytes32Env('LAUNCHPAD_CODE_HASH')
  const protocolVersion = bytes32Env('LAUNCHPAD_PROTOCOL_VERSION')
  const productionTradingEnabled = boolEnv('PRODUCTION_TRADING_ENABLED', false)
  const localDemoMode = process.env.LOCAL_DEMO_ACK === 'I_UNDERSTAND_THIS_IS_DISPOSABLE'
  const alertDeliveryEnabled = boolEnv('ALERT_DELIVERY_ENABLED', false)
  const alertWebhookUrl = optionalHttpsUrl('ALERT_WEBHOOK_URL')
  const alertWebhookSecret = boundedSecret('ALERT_WEBHOOK_SECRET')
  const discordWebhookUrl = optionalHttpsUrl('DISCORD_WEBHOOK_URL', new Set(['discord.com', 'discordapp.com']))
  const telegramBotToken = boundedSecret('TELEGRAM_BOT_TOKEN', 20)
  const telegramChatId = String(process.env.TELEGRAM_CHAT_ID ?? '').trim()
  if (telegramChatId && (!/^-?\d{1,24}$/.test(telegramChatId) || !telegramBotToken)) throw new Error('TELEGRAM_CHAT_ID requires a valid TELEGRAM_BOT_TOKEN')
  if (alertWebhookUrl && !alertWebhookSecret) throw new Error('ALERT_WEBHOOK_URL requires ALERT_WEBHOOK_SECRET')
  if (alertDeliveryEnabled && !alertWebhookUrl && !discordWebhookUrl && !(telegramBotToken && telegramChatId)) throw new Error('ALERT_DELIVERY_ENABLED requires at least one configured delivery target')
  const port = intEnv('PORT', 8787, { min: 1, max: 65_535 })
  const host = String(process.env.HOST ?? '127.0.0.1').trim()
  if (!/^(127\.0\.0\.1|0\.0\.0\.0|::1|::)$/.test(host)) throw new Error('HOST must be a loopback or wildcard bind address')
  const rawAllowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',').map((item) => item.trim()).filter(Boolean)
  if (rawAllowedOrigins.includes('*')) throw new Error('ALLOWED_ORIGINS must not contain *')
  const allowedOrigins = [...new Set(rawAllowedOrigins.map((item, index) => safeOrigin(item, `ALLOWED_ORIGINS[${index}]`)))]
  const rawAllowedHosts = (process.env.ALLOWED_HOSTS ?? 'localhost,127.0.0.1,::1')
    .split(',').map((item) => item.trim()).filter(Boolean)
  const allowedHosts = [...new Set(rawAllowedHosts.map((item, index) => safeHostname(item, `ALLOWED_HOSTS[${index}]`)))]

  if (localDemoMode) {
    if (chainId !== 31337 || !isLoopbackOrigin(new URL(rpcUrl).origin) || allowedOrigins.some((origin) => !isLoopbackOrigin(origin))) {
      throw new Error('LOCAL_DEMO_ACK is valid only for chain 31337 with loopback RPC and browser origins')
    }
  }
  if (productionTradingEnabled) {
    if (launchpadAddress === zeroAddress) throw new Error('Production trading requires LAUNCHPAD_ADDRESS')
    if (launchpadCodeHash === ZERO_HASH) throw new Error('Production trading requires LAUNCHPAD_CODE_HASH')
    if (protocolVersion === ZERO_HASH) throw new Error('Production trading requires LAUNCHPAD_PROTOCOL_VERSION')
    if (!localDemoMode && new URL(rpcUrl).protocol !== 'https:') throw new Error('Production trading requires an HTTPS RPC endpoint')
    if (!localDemoMode && new URL(explorerUrl).protocol !== 'https:') throw new Error('Production trading requires an HTTPS explorer endpoint')
    if (!localDemoMode && wsUrl && new URL(wsUrl).protocol !== 'wss:') throw new Error('Production trading requires WSS for the optional WebSocket endpoint')
    if (!localDemoMode && isPublicSharedRpc(rpcUrl)) throw new Error('Production trading requires a dedicated authenticated RPC/archive endpoint')
    if (!localDemoMode && allowedOrigins.some((origin) => new URL(origin).protocol !== 'https:' || isLoopbackOrigin(origin))) throw new Error('Production trading requires HTTPS non-loopback ALLOWED_ORIGINS')
    if (!localDemoMode && (!allowedHosts.length || allowedHosts.every(isLoopbackHost))) throw new Error('Production trading requires an explicit non-loopback ALLOWED_HOSTS entry for the indexer hostname')
  }

  const chain = defineChain({
    id: chainId,
    name: network,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
    blockExplorers: { default: { name: 'Robinhood Explorer', url: explorerUrl } }
  })

  const primaryScoutChain = {
    chainId,
    name: network,
    rpcUrl,
    rpcUrls,
    explorerUrl,
    wsUrl,
    startBlock: optionalBlock(process.env.SCOUT_START_BLOCK, 'SCOUT_START_BLOCK'),
    confirmations: intEnv('SCOUT_CONFIRMATIONS', chainId === 4663 ? 2 : 0, { min: 0, max: 128 }),
    expectedBlockTimeMs: intEnv('SCOUT_EXPECTED_BLOCK_TIME_MS', 2_000, { min: 250, max: 3_600_000 }),
    stallAfterMs: intEnv('SCOUT_CHAIN_STALL_MS', 60_000, { min: 5_000, max: 86_400_000 }),
    nativeCurrencyName: 'Ether',
    nativeCurrencySymbol: 'ETH'
  }
  const scoutLabelsFile = path.resolve(root, process.env.SCOUT_LABELS_FILE ?? 'config/scout-labels.example.json')
  const launchAlertRulesFile = path.resolve(root, process.env.LAUNCH_ALERT_RULES_FILE ?? 'config/alert-rules.example.json')
  const robinhoodRegistryFile = path.resolve(root, process.env.ROBINHOOD_REGISTRY_FILE ?? 'integrations/robinhood/registry.json')
  const launchAlertRulesSource = readJsonFile(launchAlertRulesFile, { rules: [] })
  const launchAlertRules = Array.isArray(launchAlertRulesSource?.rules) ? launchAlertRulesSource.rules.slice(0, 100) : []
  const launchRadarPolicy = parseJsonEnv('LAUNCH_RADAR_POLICY_JSON', readJsonFile(process.env.LAUNCH_RADAR_POLICY_FILE ?? 'config/execution-policy.example.json', {}))
  const scoutChains = normalizeScoutChains(primaryScoutChain)
  if (productionTradingEnabled && !localDemoMode) {
    for (const scoutChain of scoutChains) {
      for (const scoutRpcUrl of scoutChain.rpcUrls) if (new URL(scoutRpcUrl).protocol !== 'https:') throw new Error(`Production Scout RPC for chain ${scoutChain.chainId} must use HTTPS`)
      if (scoutChain.explorerUrl && new URL(scoutChain.explorerUrl).protocol !== 'https:') throw new Error(`Production Scout explorer for chain ${scoutChain.chainId} must use HTTPS`)
      if (scoutChain.wsUrl && new URL(scoutChain.wsUrl).protocol !== 'wss:') throw new Error(`Production Scout WebSocket for chain ${scoutChain.chainId} must use WSS`)
    }
  }
  const trustedProxyIps = new Set((process.env.TRUSTED_PROXY_IPS ?? '127.0.0.1,::1')
    .split(',').map((item) => item.trim()).filter(Boolean))

  return {
    host,
    port,
    chain,
    chainId,
    network,
    rpcUrl,
    explorerUrl,
    launchpadAddress,
    launchpadCodeHash,
    protocolVersion,
    allowedOrigins,
    allowedHosts,
    productionTradingEnabled,
    localDemoMode,
    requireExplorerVerification: boolEnv('REQUIRE_EXPLORER_VERIFICATION', true),
    trustProxy: boolEnv('TRUST_PROXY', false),
    trustedProxyIps,
    maxSseConnections: intEnv('MAX_SSE_CONNECTIONS', 100, { min: 1, max: 10_000 }),
    maxSsePerIp: intEnv('MAX_SSE_PER_IP', 3, { min: 1, max: 100 }),
    eventLookbackBlocks: intEnv('EVENT_LOOKBACK_BLOCKS', 25_000, { min: 100, max: 1_000_000 }),
    requestLimitPerMinute: intEnv('REQUEST_LIMIT_PER_MINUTE', 120, { min: 10, max: 10_000 }),
    scoutEnabled: boolEnv('SCOUT_ENABLED', true),
    scoutPendingEnabled: boolEnv('SCOUT_PENDING_ENABLED', false),
    scoutPendingPollIntervalMs: intEnv('SCOUT_PENDING_POLL_INTERVAL_MS', 1_000, { min: 250, max: 10_000 }),
    scoutPendingBatchLimit: intEnv('SCOUT_PENDING_BATCH_LIMIT', 100, { min: 1, max: 1_000 }),
    scoutPollIntervalMs: intEnv('SCOUT_POLL_INTERVAL_MS', 3_000, { min: 2_000, max: 300_000 }),
    scoutInitialLookback: intEnv('SCOUT_INITIAL_LOOKBACK', 100, { min: 1, max: 5_000 }),
    scoutMaxBlocksPerPoll: intEnv('SCOUT_MAX_BLOCKS_PER_POLL', 100, { min: 1, max: 500 }),
    scoutMaxRecords: intEnv('SCOUT_MAX_RECORDS', 25_000, { min: 100, max: 100_000 }),
    scoutConfirmations: primaryScoutChain.confirmations,
    scoutReorgRewind: intEnv('SCOUT_REORG_REWIND', 16, { min: 2, max: 1_000 }),
    scoutBlockConcurrency: intEnv('SCOUT_BLOCK_CONCURRENCY', 8, { min: 1, max: 32 }),
    scoutReceiptConcurrency: intEnv('SCOUT_RECEIPT_CONCURRENCY', 8, { min: 1, max: 32 }),
    scoutPoolRefreshMs: intEnv('SCOUT_POOL_REFRESH_MS', 15_000, { min: 3_000, max: 300_000 }),
    scoutPoolRefreshLimit: intEnv('SCOUT_POOL_REFRESH_LIMIT', 100, { min: 1, max: 1_000 }),
    scoutLiquidityDropBps: intEnv('SCOUT_LIQUIDITY_DROP_BPS', 5_000, { min: 100, max: 10_000 }),
    scoutChainStallMs: primaryScoutChain.stallAfterMs,
    scoutStateFlushMs: intEnv('SCOUT_STATE_FLUSH_MS', 5_000, { min: 1_000, max: 300_000 }),
    scoutStateFile: process.env.SCOUT_STATE_FILE === '' ? null : path.resolve(root, process.env.SCOUT_STATE_FILE ?? 'var/scout-state.json'),
    scoutEventJournalFile: process.env.SCOUT_EVENT_JOURNAL_FILE === '' ? null : path.resolve(root, process.env.SCOUT_EVENT_JOURNAL_FILE ?? 'var/scout-events.ndjson'),
    scoutWatchWallets: parseJsonEnv('SCOUT_WATCH_WALLETS_JSON', []),
    daoIntelligenceEnabled: boolEnv('DAO_INTELLIGENCE_ENABLED', true),
    daoRefreshMs: intEnv('DAO_REFRESH_MS', 60_000, { min: 10_000, max: 3_600_000 }),
    daoRefreshLimit: intEnv('DAO_REFRESH_LIMIT', 50, { min: 1, max: 1_000 }),
    daoInactiveDays: intEnv('DAO_INACTIVE_DAYS', 180, { min: 1, max: 10_000 }),
    daoMinimumAgeDays: intEnv('DAO_MINIMUM_AGE_DAYS', 30, { min: 1, max: 10_000 }),
    daoLowNativeBalanceWei: uintStringEnv('DAO_LOW_NATIVE_BALANCE_WEI', '1000000000000000'),
    daoDormancyAlertScore: intEnv('DAO_DORMANCY_ALERT_SCORE', 70, { min: 1, max: 100 }),
    scoutLabelsFile,
    launchAlertRulesFile,
    launchAlertRules,
    robinhoodRegistryFile,
    expectedArbOsVersion: intEnv('RH_EXPECTED_ARBOS_VERSION', 61, { min: 1, max: 10_000 }),
    launchRadarPolicy,
    scoutDexFactories: parseJsonEnv('SCOUT_DEX_FACTORIES_JSON', []),
    alertDeliveryEnabled,
    alertWebhookUrl,
    alertWebhookSecret,
    discordWebhookUrl,
    telegramBotToken,
    telegramChatId,
    alertDeliveryTimeoutMs: intEnv('ALERT_DELIVERY_TIMEOUT_MS', 5_000, { min: 1_000, max: 20_000 }),
    alertDeliveryRetries: intEnv('ALERT_DELIVERY_RETRIES', 2, { min: 0, max: 5 }),
    alertDeliveryQueueMax: intEnv('ALERT_DELIVERY_QUEUE_MAX', 500, { min: 10, max: 10_000 }),
    protocolAlertsEnabled: boolEnv('PROTOCOL_ALERTS_ENABLED', true),
    alertProtocolPollIntervalMs: intEnv('ALERT_PROTOCOL_POLL_INTERVAL_MS', 10_000, { min: 3_000, max: 300_000 }),
    alertMaxBlocksPerPoll: intEnv('ALERT_MAX_BLOCKS_PER_POLL', 100, { min: 1, max: 500 }),
    alertLargeSwapBps: intEnv('ALERT_LARGE_SWAP_BPS', 100, { min: 10, max: 500 }),
    scoutChains
  }
}
