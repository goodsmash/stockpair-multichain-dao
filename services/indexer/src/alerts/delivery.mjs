import { createHmac } from 'node:crypto'

function bounded(value, max = 160) { return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, max) }
function safeEvent(event) {
  return {
    id: bounded(event.id, 240),
    kind: bounded(event.kind, 48),
    at: bounded(event.at, 64),
    chainId: Number(event.chainId ?? 0),
    chain: bounded(event.chain, 80),
    address: bounded(event.address ?? event.pool, 64),
    token: event.token ? { name: bounded(event.token.name, 96), symbol: bounded(event.token.symbol, 24), decimals: Number(event.token.decimals ?? 0) } : null,
    deployer: bounded(event.deployer, 64),
    pool: bounded(event.pool, 64),
    transactionHash: bounded(event.transactionHash, 80),
    blockNumber: bounded(event.blockNumber, 40),
    riskScore: Number(event.risk?.score ?? 0),
    riskStatus: bounded(event.risk?.status, 24),
    explorerUrl: bounded(event.explorerUrl, 300),
    action: bounded(event.action, 64),
    actor: bounded(event.actor ?? event.provider ?? event.sender, 64),
    recipient: bounded(event.recipient, 64),
    newOwner: bounded(event.newOwner, 64),
    amountIn: bounded(event.amountIn, 96),
    amountOut: bounded(event.amountOut, 96),
    reserveShareBps: Number(event.reserveShareBps ?? 0),
    blocked: typeof event.blocked === 'boolean' ? event.blocked : null
  }
}

async function postJson(url, body, headers, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  timer.unref?.()
  try {
    const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body, signal: controller.signal, redirect: 'error', credentials: 'omit' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
  } finally { clearTimeout(timer) }
}

export function createAlertDelivery(config) {
  let delivered = 0, failed = 0, lastError = null, lastDeliveredAt = null
  const queue = []
  const seen = new Set()
  let working = false
  let stopped = false

  async function withRetry(action) {
    let error
    for (let attempt = 0; attempt <= config.alertDeliveryRetries; attempt += 1) {
      try { await action(); return } catch (current) { error = current; if (attempt < config.alertDeliveryRetries) await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt)) }
    }
    throw error
  }

  async function deliver(event) {
    const data = safeEvent(event)
    const body = JSON.stringify({ version: '1.0', event: data })
    const tasks = []
    if (config.alertWebhookUrl) {
      const timestamp = String(Math.floor(Date.now() / 1000))
      const signature = createHmac('sha256', config.alertWebhookSecret).update(`${timestamp}.${body}`).digest('hex')
      tasks.push(withRetry(() => postJson(config.alertWebhookUrl, body, { 'x-stockpair-timestamp': timestamp, 'x-stockpair-signature': `sha256=${signature}`, 'idempotency-key': data.id }, config.alertDeliveryTimeoutMs)))
    }
    if (config.discordWebhookUrl) {
      const content = `**StockPair ${data.kind}**\n${data.token?.symbol ? `${data.token.symbol} · ` : ''}${data.address || data.pool}\nChain ${data.chainId} · block ${data.blockNumber} · risk ${data.riskScore}/100\n${data.transactionHash}`.slice(0, 1900)
      tasks.push(withRetry(() => postJson(config.discordWebhookUrl, JSON.stringify({ content }), {}, config.alertDeliveryTimeoutMs)))
    }
    if (config.telegramBotToken && config.telegramChatId) {
      const url = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`
      const text = `StockPair ${data.kind}\n${data.token?.symbol ? `${data.token.symbol} ` : ''}${data.address || data.pool}\nChain ${data.chainId} block ${data.blockNumber}\nRisk ${data.riskScore}/100\n${data.transactionHash}`.slice(0, 3900)
      tasks.push(withRetry(() => postJson(url, JSON.stringify({ chat_id: config.telegramChatId, text, disable_web_page_preview: true }), {}, config.alertDeliveryTimeoutMs)))
    }
    await Promise.all(tasks)
  }

  async function drain() {
    if (working || stopped) return
    working = true
    try {
      while (queue.length && !stopped) {
        const event = queue.shift()
        try { await deliver(event); delivered += 1; lastDeliveredAt = new Date().toISOString(); lastError = null }
        catch (error) { failed += 1; lastError = error instanceof Error ? error.message : String(error) }
      }
    } finally { working = false }
  }

  function enqueue(event) {
    if (!config.alertDeliveryEnabled || stopped || !['token-detected', 'pool-created', 'pool-liquidity-live', 'watched-wallet-deployment', 'pending-contract-creation', 'liquidity-removed', 'ownership-changed', 'large-swap', 'emergency-change'].includes(event?.kind)) return false
    const key = bounded(event.id, 240)
    if (!key || seen.has(key)) return false
    seen.add(key)
    if (seen.size > 10_000) seen.delete(seen.values().next().value)
    if (queue.length >= config.alertDeliveryQueueMax) queue.shift()
    queue.push(event)
    void drain()
    return true
  }

  return {
    enqueue,
    stop: () => { stopped = true; queue.length = 0 },
    status: () => ({ enabled: config.alertDeliveryEnabled, queued: queue.length, working, delivered, failed, lastError, lastDeliveredAt, targets: { webhook: Boolean(config.alertWebhookUrl), discord: Boolean(config.discordWebhookUrl), telegram: Boolean(config.telegramBotToken && config.telegramChatId) } })
  }
}
