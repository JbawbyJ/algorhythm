/**
 * Tiny swipe-style qrels for P@k. Relevant = liked Gorpcore Acronym/Arc'teryx.
 */
export const QRELS = [
  {
    query: 'Acronym jacket',
    relevant: ['ebay:acr-j1a', 'ssense:acr-ssense'],
  },
  {
    query: "Arc'teryx",
    relevant: ['ebay:arc-beta', 'ebay:arc-atom', 'ssense:arc-ssense'],
  },
]

export function precisionAtK(rankedIds, relevantIds, k = 5) {
  const rel = new Set(relevantIds)
  const slice = rankedIds.slice(0, k)
  if (!slice.length) return 0
  const hits = slice.filter(id => rel.has(id)).length
  return hits / slice.length
}
