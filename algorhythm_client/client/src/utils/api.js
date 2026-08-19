/**
 * API Client
 * All backend calls live here — nothing calls fetch/axios directly in components.
 */

const BASE = '/api'

async function request(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body && { body: JSON.stringify(body) })
  }

  const res = await fetch(`${BASE}${path}`, opts)
  const data = await res.json()

  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`)
  return data
}

// ── Feed ──
export const feedAPI = {
  get:   (profile, page = 1, pageSize = 20) =>
    request('POST', '/feed', { profile, page, pageSize }),
  swipe: (profile, listing, action) =>
    request('POST', '/feed/swipe', { profile, listing, action }),
}

// ── Profile ──
export const profileAPI = {
  get:      (sessionId) => request('GET',    `/profile/${sessionId}`),
  save:     (sessionId, profile) => request('PUT', `/profile/${sessionId}`, { profile }),
  onboard:  (sessionId, data) => request('POST', `/profile/${sessionId}/onboard`, data),
  reset:    (sessionId) => request('DELETE', `/profile/${sessionId}`),
}

// ── eBay ──
export const ebayAPI = {
  search: (q, params = {}) => {
    const qs = new URLSearchParams({ q, ...params }).toString()
    return request('GET', `/ebay/search?${qs}`)
  }
}

// ── Price Compare ──
export const compareAPI = {
  byListing: (listing, maxResults = 10) =>
    request('POST', '/compare', { listing, maxResults }),
  byQuery:   (query, maxResults = 10) =>
    request('POST', '/compare/search', { query, maxResults }),
}
