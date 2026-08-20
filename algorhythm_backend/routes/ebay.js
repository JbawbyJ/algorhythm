import { Router } from 'express'
import { searchEbay, getEbayItem, isEbayConfigured } from '../services/ebayService.js'
import { normalizeEbayItem } from '../utils/normalizer.js'
import { searchLocalCatalog } from '../data/localCatalog.js'

const router = Router()

/**
 * GET /api/ebay/search
 * Raw eBay search — normalized.
 * Query params: q, limit, offset, condition, priceMin, priceMax
 */
router.get('/search', async (req, res, next) => {
  try {
    const {
      q        = 'Acronym jacket',
      limit    = 20,
      offset   = 0,
      condition,
      priceMin,
      priceMax,
      sort     = 'newlyListed'
    } = req.query

    let items = []
    let total = 0
    let source = 'local'

    if (isEbayConfigured()) {
      try {
        const raw = await searchEbay({
          query:    q,
          limit:    parseInt(limit),
          offset:   parseInt(offset),
          condition,
          priceMin: priceMin ? parseFloat(priceMin) : null,
          priceMax: priceMax ? parseFloat(priceMax) : null,
          sort
        })
        items = (raw.itemSummaries || []).map(normalizeEbayItem)
        total = raw.total || items.length
        if (items.length) source = 'ebay'
      } catch (err) {
        console.warn('eBay search unavailable, falling back to local catalog —', err.message)
      }
    }

    if (!items.length) {
      const local = searchLocalCatalog({
        query:    q,
        limit:    parseInt(limit),
        offset:   parseInt(offset),
        priceMin: priceMin ? parseFloat(priceMin) : null,
        priceMax: priceMax ? parseFloat(priceMax) : null,
      })
      items = local.items
      total = local.total
      source = 'local'
    }

    res.json({
      total,
      offset: parseInt(offset) || 0,
      limit:  parseInt(limit) || 20,
      source,
      items
    })

  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/ebay/item/:itemId
 * Single item detail.
 */
router.get('/item/:itemId', async (req, res, next) => {
  try {
    const raw  = await getEbayItem(req.params.itemId)
    res.json(normalizeEbayItem(raw))
  } catch (err) {
    next(err)
  }
})

export default router
