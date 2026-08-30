import fs from 'node:fs'
import { searchBrowser, isBrowserWorkerConfigured } from './browserSource.js'

export function isHbxFeedConfigured() {
  return Boolean(process.env.HBX_FEED_PATH && fs.existsSync(process.env.HBX_FEED_PATH))
}

export async function searchHbx({ query, limit = 20 } = {}) {
  if (isHbxFeedConfigured()) {
    const raw = JSON.parse(fs.readFileSync(process.env.HBX_FEED_PATH, 'utf8'))
    const items = Array.isArray(raw) ? raw : (raw.products || raw.items || [])
    const tokens = String(query || '').toLowerCase().split(/\s+/).filter(Boolean)
    const matched = tokens.length
      ? items.filter(p => {
          const hay = `${p.name || p.title || ''} ${p.brand || ''}`.toLowerCase()
          return tokens.every(t => hay.includes(t))
        })
      : items
    return matched.slice(0, limit)
  }
  if (isBrowserWorkerConfigured()) {
    return searchBrowser('hbx', { query, limit })
  }
  return []
}

export function isHbxConfigured() {
  return isHbxFeedConfigured() || isBrowserWorkerConfigured()
}
