/**
 * RFC 9111-ish GET cache. Never stores 429.
 */

const store = new Map()

export function cacheKey(method, url) {
  return `${String(method || 'GET').toUpperCase()} ${url}`
}

export function cacheGet(key) {
  const hit = store.get(key)
  if (!hit) return null
  if (Date.now() > hit.expiresAt) {
    store.delete(key)
    return null
  }
  return hit.value
}

export function cacheSet(key, value, ttlMs, { status } = {}) {
  if (status === 429) return false
  const ttl = Number(ttlMs)
  if (!Number.isFinite(ttl) || ttl <= 0) return false
  store.set(key, { value, expiresAt: Date.now() + ttl })
  return true
}

export function shouldStoreStatus(status) {
  return status !== 429
}

export function parseRetryAfter(header, fallbackMs = 30_000) {
  if (header == null || header === '') return fallbackMs
  const asInt = Number(header)
  if (Number.isFinite(asInt)) return Math.max(0, asInt * 1000)
  const when = Date.parse(header)
  if (Number.isFinite(when)) return Math.max(0, when - Date.now())
  return fallbackMs
}

export function resetCache() {
  store.clear()
}
