const K1 = 1.5
const B = 0.75

function tokenize(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1)
}

function listingText(listing) {
  return `${listing.brand || ''} ${listing.name || ''}`
}

/**
 * BM25 scores over title+brand. Returns listings with bm25 in 0..1.
 */
export function scoreBm25(listings, queries = []) {
  const qTokens = []
  for (const q of queries) {
    const w = q.weight ?? 1
    for (const t of tokenize(q.query || q.brand || '')) {
      qTokens.push({ t, w })
    }
  }
  if (!listings.length || !qTokens.length) {
    return listings.map(l => ({ ...l, bm25: 0 }))
  }

  const docs = listings.map(l => tokenize(listingText(l)))
  const avgdl = docs.reduce((s, d) => s + d.length, 0) / docs.length
  const df = new Map()
  for (const doc of docs) {
    const uniq = new Set(doc)
    for (const t of uniq) df.set(t, (df.get(t) || 0) + 1)
  }
  const N = docs.length

  const raw = docs.map((doc, i) => {
    const tf = new Map()
    for (const t of doc) tf.set(t, (tf.get(t) || 0) + 1)
    let score = 0
    for (const { t, w } of qTokens) {
      const f = tf.get(t) || 0
      if (!f) continue
      const n = df.get(t) || 0
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5))
      const denom = f + K1 * (1 - B + B * (doc.length / (avgdl || 1)))
      score += w * idf * ((f * (K1 + 1)) / denom)
    }
    return score
  })

  const max = Math.max(...raw, 0.0001)
  return listings.map((l, i) => ({ ...l, bm25: raw[i] / max }))
}
