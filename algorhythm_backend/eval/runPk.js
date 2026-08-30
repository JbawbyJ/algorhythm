import { getLocalCatalog } from '../data/localCatalog.js'
import { rankListingsForProfile, DEFAULT_PROFILE } from '../utils/tasteScorer.js'
import { QRELS, precisionAtK } from './qrels.js'

const profile = {
  ...DEFAULT_PROFILE,
  aesthetics: ['Gorpcore'],
  priceRange: { min: 0, max: 2000 },
  mode: 'both',
}

const catalog = getLocalCatalog()
let sum = 0
for (const q of QRELS) {
  const ranked = rankListingsForProfile(catalog, profile, [{ query: q.query, brand: q.query }])
  const p = precisionAtK(ranked.map(i => i.id), q.relevant, 5)
  sum += p
  console.log(`P@5 ${q.query}: ${p.toFixed(2)}`)
}
console.log(`macro P@5: ${(sum / QRELS.length).toFixed(2)}`)
