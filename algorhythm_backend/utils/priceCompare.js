/**
 * Price compare — group similar listings and score the source price
 * against the local market set. Used by POST /api/compare.
 */

const COLOR_WORDS = [
  'black', 'white', 'green', 'olive', 'army', 'forage', 'grey', 'gray',
  'sand', 'neutral', 'brown', 'purple', 'worn',
]

function tokens(text = '') {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter(t => t && t.length > 1 && !COLOR_WORDS.includes(t))
}

function colorsOf(text = '') {
  const words = text.toLowerCase().split(/[\s-]+/)
  return new Set(COLOR_WORDS.filter(c => words.includes(c)))
}

function overlapRatio(a, b) {
  if (!a.length || !b.length) return 0
  const setB = new Set(b)
  const hits = a.filter(t => setB.has(t)).length
  return hits / Math.max(a.length, b.length)
}

function sameBrand(a, b) {
  return (a.brand || '').toLowerCase() === (b.brand || '').toLowerCase()
}

/**
 * Classify a candidate against the source listing.
 * Returns { tier, similarity } or null if too weak to include.
 */
export function classifyMatch(source, candidate) {
  if (source.id && candidate.id === source.id) return null

  const srcTokens = tokens(source.name)
  const candTokens = tokens(candidate.name)
  const ratio = overlapRatio(srcTokens, candTokens)
  const srcColors = colorsOf(source.name)
  const candColors = colorsOf(candidate.name)
  const colorOverlap = [...srcColors].some(c => candColors.has(c))
  const bothHaveColor = srcColors.size > 0 && candColors.size > 0
  const brandsMatch = sameBrand(source, candidate)

  // Cross-brand SKU-identical pieces still group at exact; weaker tiers stay same-brand.
  if (!brandsMatch && ratio < 0.72) return null

  let tier
  let similarity

  if (ratio >= 0.72) {
    tier = 'exactMatch'
    similarity = Math.round(90 + ratio * 10)
  } else if (ratio >= 0.4 && bothHaveColor && !colorOverlap) {
    tier = 'colorMatch'
    similarity = Math.round(70 + ratio * 20)
  } else if (ratio >= 0.28) {
    tier = 'modelMatch'
    similarity = Math.round(55 + ratio * 25)
  } else {
    tier = 'brandMatch'
    similarity = Math.round(35 + ratio * 20)
  }

  return { tier, similarity: Math.min(similarity, 99) }
}

function statsFor(prices, sourcePrice) {
  if (!prices.length) {
    return { min: null, avg: null, median: null, max: null, count: 0, dealScore: 'unknown' }
  }

  const sorted = [...prices].sort((a, b) => a - b)
  const min = sorted[0]
  const max = sorted[sorted.length - 1]
  const avg = Math.round(sorted.reduce((s, p) => s + p, 0) / sorted.length)
  const mid = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2)

  let dealScore = 'fair'
  if (sourcePrice <= median * 0.85) dealScore = 'great'
  else if (sourcePrice <= median * 0.95) dealScore = 'good'
  else if (sourcePrice > median * 1.15) dealScore = 'high'

  return { min, avg, median, max, count: sorted.length, dealScore }
}

function decorate(candidate, source, similarity) {
  const priceDelta = Math.round((candidate.price || 0) - (source.price || 0))
  const priceDeltaPct = source.price
    ? Math.round((priceDelta / source.price) * 100)
    : 0

  return {
    ...candidate,
    similarity,
    priceDelta,
    priceDeltaPct,
  }
}

/**
 * Compare a source listing against a candidate pool.
 */
export function compareListing(source, candidates, maxResults = 10) {
  const grouped = {
    exactMatch: [],
    colorMatch: [],
    modelMatch: [],
    brandMatch: [],
  }

  for (const candidate of candidates) {
    const match = classifyMatch(source, candidate)
    if (!match) continue
    grouped[match.tier].push(decorate(candidate, source, match.similarity))
  }

  for (const tier of Object.keys(grouped)) {
    grouped[tier].sort((a, b) => b.similarity - a.similarity || a.price - b.price)
    grouped[tier] = grouped[tier].slice(0, maxResults)
  }

  const market = Object.values(grouped).flat()
  const prices = [source.price, ...market.map(i => i.price)].filter(p => typeof p === 'number')

  return {
    source,
    stats: statsFor(prices, source.price),
    grouped,
  }
}

/**
 * Compare from a free-text query: pick the best catalog hit as source.
 */
export function compareQuery(query, candidates, maxResults = 10) {
  const q = (query || '').trim().toLowerCase()
  if (!q) return null

  const scored = candidates
    .map(item => {
      const hay = `${item.brand} ${item.name}`.toLowerCase()
      const tokensIn = q.split(/\s+/).filter(Boolean)
      const hits = tokensIn.filter(t => hay.includes(t)).length
      return { item, hits, len: hay.length }
    })
    .filter(s => s.hits > 0)
    .sort((a, b) => b.hits - a.hits || a.len - b.len)

  if (!scored.length) return null
  return compareListing(scored[0].item, candidates, maxResults)
}
