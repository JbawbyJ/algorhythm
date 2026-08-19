import { Router } from 'express'
import { searchEbay, getEbayItem } from '../services/ebayService.js'
import { normalizeEbayItem } from '../utils/normalizer.js'

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

    const raw = await searchEbay({
      query:    q,
      limit:    parseInt(limit),
      offset:   parseInt(offset),
      condition,
      priceMin: priceMin ? parseFloat(priceMin) : null,
      priceMax: priceMax ? parseFloat(priceMax) : null,
      sort
    })

    const items = (raw.itemSummaries || []).map(normalizeEbayItem)

    res.json({
      total:  raw.total || 0,
      offset: raw.offset || 0,
      limit:  raw.limit || 20,
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
