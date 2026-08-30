import axios from 'axios'
import { cacheGet, cacheKey, cacheSet, parseRetryAfter } from './httpCache.js'

const BASE = process.env.LUKES_BASE_URL || 'https://lukes.store'

export function isLukesEnabled() {
  const v = (process.env.LUKES_ENABLED || '').toLowerCase()
  return v === '1' || v === 'true' || v === 'yes'
}

function tooMany(err) {
  const status = err.response?.status
  if (status !== 429) return err
  const wait = parseRetryAfter(err.response?.headers?.['retry-after'])
  const e = new Error('Luke\'s store returned 429')
  e.status = 429
  e.retryAfter = wait
  return e
}

export async function fetchLukesCollection(handle = 'all', limit = 50) {
  const url = `${BASE}/collections/${handle}/products.json?limit=${Math.min(limit, 250)}`
  const key = cacheKey('GET', url)
  const hit = cacheGet(key)
  if (hit) return hit

  try {
    const res = await axios.get(url, { timeout: 15_000, validateStatus: s => s < 500 })
    if (res.status === 429) {
      cacheSet(key, null, 1, { status: 429 })
      throw tooMany({ response: res })
    }
    if (res.status >= 400) throw new Error(`Luke's HTTP ${res.status}`)
    cacheSet(key, res.data, 5 * 60_000, { status: 200 })
    return res.data
  } catch (err) {
    throw tooMany(err)
  }
}

export async function searchLukes({ query, limit = 20 } = {}) {
  const data = await fetchLukesCollection('all', 80)
  const products = data.products || []
  const tokens = String(query || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
  const matched = tokens.length
    ? products.filter(p => {
        const hay = `${p.title} ${p.vendor} ${(p.tags || []).join(' ')}`.toLowerCase()
        return tokens.every(t => hay.includes(t))
      })
    : products
  return matched.slice(0, limit)
}
