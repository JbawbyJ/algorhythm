import { Router } from 'express'
import { rankListingsForProfile, DEFAULT_PROFILE } from '../utils/tasteScorer.js'
import { buildSearchQueriesForProfile } from '../data/brands.js'
import { expandQueries } from '../utils/queryExpand.js'
import { getLocalCatalog } from '../data/localCatalog.js'
import { listingIndex } from '../services/listingIndex.js'
import { searchAll, liveConfigured, allowLocalCatalog } from '../services/sourceBroker.js'

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

    const queries = buildSearchQueriesForProfile(profile)
    const activeQueries = expandQueries(
      queries.length > 0
        ? queries
        : [
            { query: 'Acronym jacket', aesthetic: 'Gorpcore', brand: 'Acronym' },
            { query: 'Rick Owens', aesthetic: 'Dark Luxury', brand: 'Rick Owens' },
            { query: "Arc'teryx Veilance", aesthetic: 'Gorpcore', brand: "Arc'teryx Veilance" },
          ]
    )

    const sources = []
    const useLocal = allowLocalCatalog()

    if (useLocal) {
      listingIndex.upsert(getLocalCatalog())
      sources.push('local')
    } else {
      listingIndex.dropSource('local')
    }

    if (liveConfigured()) {
      const result = await searchAll(activeQueries, { mode: profile.mode || 'both' })
      listingIndex.upsert(result.items)
      sources.push(...result.sources)
    }

    const unique = listingIndex.candidates()
    const ranked = rankListingsForProfile(unique, profile, activeQueries)

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

export default router
