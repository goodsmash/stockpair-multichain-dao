import { getAddress, isAddress, type Address } from 'viem'

export type SafeRiskStatus = 'TRUSTED' | 'LOW' | 'CAUTION' | 'DANGER' | 'BLOCKED'

const HASH_RE = /^0x[0-9a-fA-F]{64}$/
const HEX_RE = /^0x[0-9a-fA-F]+$/
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1'])

export function normalizeRiskStatus(value: unknown): SafeRiskStatus {
  return ['TRUSTED', 'LOW', 'CAUTION', 'DANGER', 'BLOCKED'].includes(String(value))
    ? String(value) as SafeRiskStatus
    : 'BLOCKED'
}

export function safeAddress(value: unknown): Address | null {
  return typeof value === 'string' && isAddress(value) ? getAddress(value) : null
}

export function safeHash(value: unknown): string | null {
  return typeof value === 'string' && HASH_RE.test(value) ? value.toLowerCase() : null
}

export function safeHex(value: unknown): string | null {
  return typeof value === 'string' && HEX_RE.test(value) ? value.toLowerCase() : null
}

export function safeShortHex(value: unknown): string {
  const text = safeHex(value)
  if (!text || text.length < 12) return 'Invalid value'
  return `${text.slice(0, 6)}…${text.slice(-4)}`
}

export function boundedText(value: unknown, max = 160): string {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, max) : ''
}

export function safeInteger(value: unknown, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  const number = Number(value)
  return Number.isSafeInteger(number) && number >= min && number <= max ? number : fallback
}

export function safeBoolean(value: unknown): boolean {
  return value === true
}

export function safeNumericString(value: unknown, fallback = '0'): string {
  const text = typeof value === 'bigint' ? value.toString() : String(value ?? '')
  return /^\d+$/.test(text) ? text : fallback
}

export function safeExternalBase(value: unknown, fallback: string): string {
  const candidate = typeof value === 'string' && value ? value : fallback
  try {
    const url = new URL(candidate)
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
    const localHttp = url.protocol === 'http:' && LOOPBACK_HOSTS.has(hostname)
    if (url.protocol !== 'https:' && !localHttp) return fallback
    if (url.username || url.password) return fallback
    return url.origin
  } catch {
    return fallback
  }
}

export function safeExplorerUrl(base: unknown, fallback: string, kind: 'address' | 'tx', value: unknown): string {
  const id = kind === 'address' ? safeAddress(value) : safeHash(value)
  if (!id) return '#'
  return `${safeExternalBase(base, fallback)}/${kind}/${encodeURIComponent(id)}`
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}
