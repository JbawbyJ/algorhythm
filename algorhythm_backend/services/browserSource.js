export function browserWorkerUrl() {
  return (process.env.BROWSER_WORKER_URL || '').replace(/\/$/, '')
}

export function isBrowserWorkerConfigured() {
  return Boolean(browserWorkerUrl())
}

export async function searchBrowser(site, { query, limit = 20 } = {}) {
  const base = browserWorkerUrl()
  if (!base || !query) return []
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 30_000)
  try {
    const res = await fetch(`${base}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site, query, limit }),
      signal: ctrl.signal,
    })
    if (res.status === 429) {
      const err = new Error(`${site} browser worker 429`)
      err.status = 429
      throw err
    }
    if (!res.ok) return []
    const data = await res.json()
    return data.items || []
  } catch (err) {
    if (err.status === 429) throw err
    console.warn(`browserSource ${site}:`, err.message)
    return []
  } finally {
    clearTimeout(t)
  }
}
