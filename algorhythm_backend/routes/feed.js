import { Router } from 'express'
import { searchEbay, isEbayConfigured } from '../services/ebayService.js'
import { normalizeEbayItem } from '../utils/normalizer.js'
import { rankListingsForProfile, DEFAULT_PROFILE } from '../utils/tasteScorer.js'
import { buildSearchQueriesForProfile } from '../data/brands.js'
import { getLocalCatalog } from '../data/localCatalog.js'

const router = Router()

/**
 * POST /api/feed
 * Main feed endpoint. Accepts a taste profile, returns ranked listings.
 *
 * Body: { profile: TasteProfile, page: number, pageSize: number }
 *
 * This is the core loop:
 * 1. Build search queries from the user's taste profile
 * 2. Fire those queries at eBay (+ other sources later)
 * 3. Normalize all results to standard schema
 * 4. Score + rank against taste profile
 * 5. Return paginated ranked feed
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      profile  = DEFAULT_PROFILE,
      page     = 1,
      pageSize = 20
    } = req.body

    // Build queries from profile aesthetics + liked brands
    const queries = buildSearchQueriesForProfile(profile)

    // If no profile yet, use default gorpcore/dark luxury queries
    const activeQueries = queries.length > 0
      ? queries.slice(0, 5)  // cap at 5 queries per feed load to stay polite on API
      : [
          { query: 'Acronym jacket', aesthetic: 'Gorpcore' },
          { query: 'Rick Owens', aesthetic: 'Dark Luxury' },
          { query: "Arc'teryx Veilance", aesthetic: 'Gorpcore' },
        ]

    // Fetch from eBay in parallel when credentials are present.
    // Always merge the local catalog so the core loop works offline.
    const allItems = [...getLocalCatalog()]
    const sources = ['local']

    if (isEbayConfigured()) {
      const ebayResults = await Promise.allSettled(
        activeQueries.map(q =>
          searchEbay({
            query:    q.query,
            limit:    10,
            priceMin: profile.priceRange?.min || null,
            priceMax: profile.priceRange?.max || null,
            condition: mapConditionToEbay(profile.conditionTolerance)
          })
        )
      )

      let ebayCount = 0
      for (const result of ebayResults) {
        if (result.status === 'fulfilled' && result.value.itemSummaries) {
          allItems.push(...result.value.itemSummaries.map(normalizeEbayItem))
          ebayCount += result.value.itemSummaries.length
        }
      }
      if (ebayCount > 0) sources.push('ebay')
    }

    // Deduplicate by id
    const seen = new Set()
    const unique = allItems.filter(item => {
      if (seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })

    // Score + rank
    const ranked = rankListingsForProfile(unique, profile)

    // Paginate
    const start = (page - 1) * pageSize
    const paginated = ranked.slice(start, start + pageSize)

    res.json({
      page,
      pageSize,
      total:       ranked.length,
      totalPages:  Math.ceil(ranked.length / pageSize),
      feedDepth:   profile.feedDepth || 0,
      sources,
      items:       paginated
    })

  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/feed/swipe
 * Record a swipe and return the updated profile.
 * action: 'like' | 'dislike' | 'save'
 */
router.post('/swipe', async (req, res, next) => {
  try {
    const { profile, listing, action } = req.body

    if (!profile || !listing || !action) {
      return res.status(400).json({ error: 'profile, listing, and action are required' })
    }
    if (!['like', 'dislike', 'save'].includes(action)) {
      return res.status(400).json({ error: 'action must be like | dislike | save' })
    }

    const { applySwipeFeedback } = await import('../utils/tasteScorer.js')
    const updatedProfile = applySwipeFeedback(profile, listing, action)

    res.json({ profile: updatedProfile })

  } catch (err) {
    next(err)
  }
})

// Map our condition tolerance to eBay condition filter
function mapConditionToEbay(tolerance) {
  const map = {
    new_only:  'NEW',
    like_new:  'USED',
    good:      'USED',
    any:       null
  }
  return map[tolerance] ?? null
}

export default router
