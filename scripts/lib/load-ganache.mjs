import { EventEmitter } from 'node:events'

let cached

export async function loadGanache({ announce = false } = {}) {
  if (cached) return cached
  EventEmitter.defaultMaxListeners = Math.max(EventEmitter.defaultMaxListeners, 50)
  process.env.UWS_USE_FALLBACK = 'true'
  const originalLog = console.log
  const originalWarn = console.warn
  const suppressFallbackNotice = (...args) => {
    const text = args.map((value) => String(value ?? '')).join(' ')
    if (text.includes('Using µWS fallback implementation') || text.includes('This version of µWS is not compatible')) return
    originalLog(...args)
  }
  console.log = suppressFallbackNotice
  console.warn = suppressFallbackNotice
  try {
    const module = await import('ganache')
    cached = module.default
  } finally {
    console.log = originalLog
    console.warn = originalWarn
  }
  if (announce) originalLog('Local EVM engine: deterministic JavaScript transport enabled for Node 22 compatibility.')
  return cached
}
