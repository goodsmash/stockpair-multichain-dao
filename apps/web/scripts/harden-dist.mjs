import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const indexPath = path.join(dist, 'index.html')
const headersPath = path.join(dist, '_headers')
const env = { ...loadEnv('production', root, ''), ...process.env }

function connectOrigin(value, name) {
  if (!value) return null
  const url = new URL(value)
  if (!['https:', 'wss:'].includes(url.protocol)) throw new Error(`${name} must use https or wss in production output`)
  if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(url.hostname)) throw new Error(`${name} contains a local-network target`)
  return url.origin
}

const origins = new Set(["'self'"])
const rpcValue = env.VITE_RPC_URL || 'https://rpc.testnet.chain.robinhood.com'
for (const [name, value] of [['VITE_RPC_URL', rpcValue], ['VITE_INDEXER_URL', env.VITE_INDEXER_URL]]) {
  const origin = connectOrigin(value, name)
  if (origin) origins.add(origin)
}
const rpc = new URL(rpcValue)
if (rpc?.protocol === 'https:') origins.add(`wss://${rpc.host}`)
const indexer = env.VITE_INDEXER_URL ? new URL(env.VITE_INDEXER_URL) : null
if (indexer?.protocol === 'https:') origins.add(`wss://${indexer.host}`)

const policy = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  `connect-src ${[...origins].join(' ')}`,
  "img-src 'self' data:",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "manifest-src 'self'",
  "worker-src 'self'"
].join('; ')

let html = fs.readFileSync(indexPath, 'utf8')
if (/http-equiv=["']Content-Security-Policy/i.test(html)) throw new Error('Unexpected source CSP already present in dist index')
html = html.replace('</head>', `    <meta http-equiv="Content-Security-Policy" content="${policy}" />\n  </head>`)
fs.writeFileSync(indexPath, html)

const headers = `/*\n  Content-Security-Policy: ${policy}\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n  Referrer-Policy: no-referrer\n  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=()\n  Cross-Origin-Opener-Policy: same-origin\n  Cross-Origin-Resource-Policy: same-origin\n  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload\n\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n`
fs.writeFileSync(headersPath, headers)

for (const file of [indexPath, headersPath]) {
  const text = fs.readFileSync(file, 'utf8')
  if (/127\.0\.0\.1|localhost|0\.0\.0\.0/i.test(text)) throw new Error(`${path.basename(file)} contains a local-network target`)
  if (!text.includes("object-src 'none'") || !text.includes("frame-ancestors 'none'")) throw new Error(`${path.basename(file)} is missing required CSP restrictions`)
}
console.log(`Production dist CSP hardened for ${[...origins].join(', ')}`)
