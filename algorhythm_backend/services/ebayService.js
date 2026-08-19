/**
 * eBay API Service
 * Handles OAuth token management and Browse API calls.
 * Docs: https://developer.ebay.com/api-docs/buy/browse/overview.html
 */

import axios from 'axios'

// ── eBay endpoints ──
const ENDPOINTS = {
  SANDBOX:    { auth: 'https://api.sandbox.ebay.com/identity/v1/oauth2/token',    browse: 'https://api.sandbox.ebay.com/buy/browse/v1' },
  PRODUCTION: { auth: 'https://api.ebay.com/identity/v1/oauth2/token',            browse: 'https://api.ebay.com/buy/browse/v1' }
}

const ENV    = process.env.EBAY_ENV || 'SANDBOX'
const BASE   = ENDPOINTS[ENV]

// ── Token cache — eBay tokens last 2 hours, we cache them ──
let tokenCache = { token: null, expiresAt: 0 }

export function isEbayConfigured() {
  const id = process.env.EBAY_CLIENT_ID
  const secret = process.env.EBAY_CLIENT_SECRET
  return Boolean(
    id && secret &&
    id !== 'your_ebay_client_id_here' &&
    secret !== 'your_ebay_client_secret_here'
  )
}

/**
 * Get (or refresh) an eBay OAuth client credentials token.
 * This is the Application token — no user login needed for Browse API.
 */
export async function getEbayToken() {
  if (!isEbayConfigured()) {
    throw new Error('eBay API is not configured')
  }

  const now = Date.now()

  // Return cached token if still valid (with 5 min buffer)
  if (tokenCache.token && now < tokenCache.expiresAt - 300_000) {
    return tokenCache.token
  }

  const credentials = Buffer.from(
    `${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`
  ).toString('base64')

  try {
    const res = await axios.post(
      BASE.auth,
      'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope',
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    )

    tokenCache = {
      token:     res.data.access_token,
      expiresAt: now + res.data.expires_in * 1000
    }

    console.log(`✅ eBay token refreshed (${ENV}) — expires in ${Math.round(res.data.expires_in / 60)} min`)
    return tokenCache.token

  } catch (err) {
    console.error('❌ eBay token error:', err.response?.data || err.message)
    throw new Error('Failed to authenticate with eBay API')
  }
}

/**
 * Search eBay listings via Browse API.
 *
 * @param {Object} params
 * @param {string} params.query         - Search query string (e.g. "Acronym jacket")
 * @param {number} params.limit         - Results per page (max 200)
 * @param {number} params.offset        - Pagination offset
 * @param {string} params.categoryId    - eBay category ID (11450 = Men's Clothing)
 * @param {string} params.condition     - 'NEW' | 'USED' | null for both
 * @param {number} params.priceMin      - Min price in USD
 * @param {number} params.priceMax      - Max price in USD
 * @param {string} params.sort          - 'price', '-price', 'newlyListed', 'endingSoonest'
 */
export async function searchEbay({
  query,
  limit       = 20,
  offset      = 0,
  categoryId  = '11450',    // Men's Clothing — change for other categories
  condition   = null,
  priceMin    = null,
  priceMax    = null,
  sort        = 'newlyListed'
} = {}) {

  const token = await getEbayToken()

  // Build filter string
  const filters = []
  if (condition)  filters.push(`conditionIds:{${condition === 'NEW' ? '1000' : '3000|4000|5000'}}`)
  if (priceMin)   filters.push(`price:[${priceMin}]`)
  if (priceMax)   filters.push(`price:[..${priceMax}]`)
  if (priceMin && priceMax) filters.pop(), filters.pop(),
    filters.push(`price:[${priceMin}..${priceMax}]`)

  const params = {
    q:          query,
    limit,
    offset,
    sort,
    ...(categoryId && { category_ids: categoryId }),
    ...(filters.length && { filter: filters.join(',') })
  }

  try {
    const res = await axios.get(`${BASE.browse}/item_summary/search`, {
      headers: {
        'Authorization':       `Bearer ${token}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
        'Content-Type':        'application/json'
      },
      params
    })

    return res.data

  } catch (err) {
    console.error('❌ eBay search error:', err.response?.data || err.message)
    throw new Error(`eBay search failed: ${err.response?.data?.errors?.[0]?.message || err.message}`)
  }
}

/**
 * Get a single eBay item by ID.
 */
export async function getEbayItem(itemId) {
  const token = await getEbayToken()

  try {
    const res = await axios.get(`${BASE.browse}/item/${itemId}`, {
      headers: {
        'Authorization':           `Bearer ${token}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
      }
    })
    return res.data
  } catch (err) {
    throw new Error(`eBay item fetch failed: ${err.response?.data?.errors?.[0]?.message || err.message}`)
  }
}
