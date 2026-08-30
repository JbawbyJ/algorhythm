import { isEbayConfigured, searchEbay } from './ebayService.js'
import { isLukesEnabled, searchLukes } from './lukesService.js'
import { isSsenseConfigured, searchSsense } from './ssenseFeedService.js'
import { isHbxConfigured, searchHbx } from './hbxFeedService.js'
import { isYahooJpConfigured, searchYahooJp } from './yahooJpService.js'
import { isBrowserWorkerConfigured, searchBrowser } from './browserSource.js'
import {
  normalizeEbayItem,
  normalizeLukesItem,
  normalizeSsenseItem,
  normalizeHbxItem,
  normalizeGrailedItem,
  normalizeYahooJpItem,
} from '../utils/normalizer.js'
import { SOURCE_QUALITY } from '../utils/sourceQuality.js'

export { SOURCE_QUALITY }

const hitRate = new Map()

function recordHit(source, n) {
  const prev = hitRate.get(source) || { hits: 0, runs: 0 }
  hitRate.set(source, { hits: prev.hits + n, runs: prev.runs + 1 })
}

export function sourceScore(source) {
  const s = hitRate.get(source)
  if (!s || !s.runs) return SOURCE_QUALITY[source] ?? 0.5
  return (s.hits / s.runs) * (SOURCE_QUALITY[source] ?? 0.5)
}

let testAdapters = null

export function setTestAdapters(adapters) {
  testAdapters = adapters
}

export function liveConfigured() {
  if (testAdapters?.length) return true
  return (
    isEbayConfigured() ||
    isLukesEnabled() ||
    isSsenseConfigured() ||
    isHbxConfigured() ||
    isYahooJpConfigured() ||
    isBrowserWorkerConfigured()
  )
}

export function allowLocalCatalog() {
  return process.env.ALGORHYTHM_ALLOW_LOCAL === '1' || !liveConfigured()
}

export function configuredSourceIds() {
  if (testAdapters) return testAdapters.map(a => a.id)
  const ids = []
  if (isEbayConfigured()) ids.push('ebay')
  if (isLukesEnabled()) ids.push('lukes')
  if (isYahooJpConfigured()) ids.push('yahoo_jp')
  if (isSsenseConfigured()) ids.push('ssense')
  if (isHbxConfigured()) ids.push('hbx')
  if (isBrowserWorkerConfigured() && !ids.includes('grailed')) ids.push('grailed')
  if (isBrowserWorkerConfigured() && !ids.includes('ssense')) ids.push('ssense')
  if (isBrowserWorkerConfigured() && !ids.includes('hbx')) ids.push('hbx')
  return [...new Set(ids)]
}

export function selectSources(mode = 'both', { maxSources = 4 } = {}) {
  const all = configuredSourceIds()
  const retail = new Set(['ssense', 'hbx'])
  const resale = new Set(['ebay', 'lukes', 'grailed', 'yahoo_jp'])
  let picked = all
  if (mode === 'retail') picked = all.filter(s => retail.has(s))
  else if (mode === 'resale') picked = all.filter(s => resale.has(s))
  return picked
    .sort((a, b) => sourceScore(b) - sourceScore(a))
    .slice(0, maxSources)
}

function adapters() {
  if (testAdapters) return testAdapters
  return [
    {
      id: 'ebay',
      enabled: isEbayConfigured,
      search: async (q, limit) => {
        const raw = await searchEbay({ query: q.query, limit })
        return (raw.itemSummaries || []).map(normalizeEbayItem)
      },
    },
    {
      id: 'lukes',
      enabled: isLukesEnabled,
      search: async (q, limit) => (await searchLukes({ query: q.query, limit })).map(normalizeLukesItem),
    },
    {
      id: 'ssense',
      enabled: isSsenseConfigured,
      search: async (q, limit) => {
        const raw = await searchSsense({ query: q.query, limit })
        return raw.map(item => (item.source ? item : normalizeSsenseItem(item)))
      },
    },
    {
      id: 'hbx',
      enabled: isHbxConfigured,
      search: async (q, limit) => {
        const raw = await searchHbx({ query: q.query, limit })
        return raw.map(item => (item.source ? item : normalizeHbxItem(item)))
      },
    },
    {
      id: 'grailed',
      enabled: isBrowserWorkerConfigured,
      search: async (q, limit) => {
        const raw = await searchBrowser('grailed', { query: q.query, limit })
        return raw.map(item => (item.source ? item : normalizeGrailedItem(item)))
      },
    },
    {
      id: 'yahoo_jp',
      enabled: isYahooJpConfigured,
      search: async (q, limit) => (await searchYahooJp({ query: q.query, limit })).map(normalizeYahooJpItem),
    },
  ]
}

function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out`)), ms)
    promise.then(v => { clearTimeout(t); resolve(v) }, e => { clearTimeout(t); reject(e) })
  })
}

export async function searchAll(queries, { mode = 'both', perQuery = 8 } = {}) {
  const ids = selectSources(mode)
  const active = adapters().filter(a => ids.includes(a.id) && a.enabled())
  const sources = []
  const items = []

  const jobs = []
  for (const adapter of active) {
    const qslice = queries.slice(0, 5)
    jobs.push(
      withTimeout(
        Promise.allSettled(qslice.map(q => adapter.search(q, perQuery))),
        25_000,
        adapter.id,
      ).then(results => ({ adapter, results }))
        .catch(err => ({ adapter, error: err }))
    )
  }

  const settled = await Promise.all(jobs)
  for (const slot of settled) {
    if (slot.error) {
      console.warn(`source ${slot.adapter.id} failed:`, slot.error.message)
      recordHit(slot.adapter.id, 0)
      continue
    }
    let n = 0
    for (const r of slot.results) {
      if (r.status === 'fulfilled' && Array.isArray(r.value)) {
        items.push(...r.value)
        n += r.value.length
      }
    }
    if (n > 0) sources.push(slot.adapter.id)
    recordHit(slot.adapter.id, n)
  }

  return { sources, items }
}
