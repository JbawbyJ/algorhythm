import { BRANDS } from '../data/brands.js'

/**
 * Add related-brand queries (same aesthetic) at down-weight 0.5.
 */
export function expandQueries(queries = [], { maxTotal = 8, extraPerQuery = 1 } = {}) {
  const out = queries.map(q => ({ ...q, expanded: Boolean(q.expanded), weight: q.weight ?? 1 }))
  const seen = new Set(out.map(q => (q.query || '').toLowerCase()))

  for (const q of queries) {
    if (out.length >= maxTotal) break
    const brand = BRANDS.find(b => b.name.toLowerCase() === String(q.brand || q.query || '').toLowerCase())
    if (!brand) continue
    const related = BRANDS.filter(b =>
      b.name !== brand.name && b.aesthetics.some(a => brand.aesthetics.includes(a))
    )
    let added = 0
    for (const r of related) {
      if (added >= extraPerQuery || out.length >= maxTotal) break
      const key = r.name.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push({
        query: r.name,
        aesthetic: q.aesthetic,
        brand: r.name,
        expanded: true,
        weight: 0.5,
      })
      added += 1
    }
  }

  return out.slice(0, maxTotal)
}
