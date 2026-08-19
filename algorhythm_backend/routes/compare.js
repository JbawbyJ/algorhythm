import { Router } from 'express'
import { getLocalCatalog, searchLocalCatalog } from '../data/localCatalog.js'
import { searchEbay, isEbayConfigured } from '../services/ebayService.js'
import { normalizeEbayItem } from '../utils/normalizer.js'
import { compareListing, compareQuery } from '../utils/priceCompare.js'

const router = Router()

async function ebayCandidates(query, limit = 10) {
  if (!isEbayConfigured() || !query) return []
  try {
    const raw = await searchEbay({ query, limit })
    return (raw.itemSummaries || []).map(normalizeEbayItem)
  } catch (err) {
    console.warn('compare: eBay unavailable, using local catalog only —', err.message)
    return []
  }
}

/**
 * POST /api/compare
 * Body: { listing, maxResults }
 */
router.post('/', async (req, res, next) => {
  try {
    const { listing, maxResults = 10 } = req.body
    if (!listing?.brand && !listing?.name) {
      return res.status(400).json({ error: 'listing with brand or name is required' })
    }

    const query = [listing.brand, listing.name].filter(Boolean).join(' ')
    const remote = await ebayCandidates(query, 10)
    const candidates = [...getLocalCatalog(), ...remote]
    const result = compareListing(listing, candidates, maxResults)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/compare/search
 * Body: { query, maxResults }
 */
router.post('/search', async (req, res, next) => {
  try {
    const { query, maxResults = 10 } = req.body
    if (!query || !String(query).trim()) {
      return res.status(400).json({ error: 'query is required' })
    }

    const remote = await ebayCandidates(query, 10)
    const local = searchLocalCatalog({ query, limit: 50 }).items
    // If the query is too narrow, still allow brand-level local matches via full catalog
    const pool = [...(local.length ? local : getLocalCatalog()), ...remote]
    const result = compareQuery(query, pool, maxResults)

    if (!result) {
      return res.status(404).json({ error: `No comparable listings for “${query}”` })
    }

    res.json(result)
  } catch (err) {
    next(err)
  }
})

export default router
