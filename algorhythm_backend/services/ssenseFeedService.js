import fs from 'node:fs'
import { searchBrowser, isBrowserWorkerConfigured } from './browserSource.js'

export function isSsenseFeedConfigured() {
  return Boolean(process.env.SSENSE_FEED_PATH && fs.existsSync(process.env.SSENSE_FEED_PATH))
}

export async function searchSsense({ query, limit = 20 } = {}) {
  if (isSsenseFeedConfigured()) {
    const raw = JSON.parse(fs.readFileSync(process.env.SSENSE_FEED_PATH, 'utf8'))
    const items = Array.isArray(raw) ? raw : (raw.products || raw.items || [])
    const tokens = String(query || '').toLowerCase().split(/\s+/).filter(Boolean)
    const matched = tokens.length
      ? items.filter(p => {
          const hay = `${p.name || p.title || ''} ${p.brand || p.designer || ''}`.toLowerCase()
          return tokens.every(t => hay.includes(t))
        })
      : items
    return matched.slice(0, limit)
  }
  if (isBrowserWorkerConfigured()) {
    return searchBrowser('ssense', { query, limit })
  }
  return []
}

export function isSsenseConfigured() {
  return isSsenseFeedConfigured() || isBrowserWorkerConfigured()
}
