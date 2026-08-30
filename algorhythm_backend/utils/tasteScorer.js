/**
 * Taste Scoring Engine
 *
 * Takes a normalized listing + a user's taste profile
 * and returns a match score 0–100.
 *
 * This is the core of the algorithm.
 * Right now it's weighted rules — later this becomes
 * a vector similarity calculation against embeddings.
 */

import { scoreBm25 } from './bm25.js'
import { SOURCE_QUALITY } from './sourceQuality.js'

/**
 * Default taste profile shape.
 * This is what gets stored per user in Supabase.
 */
export const DEFAULT_PROFILE = {
  aesthetics:     [],           // e.g. ['Gorpcore', 'Dark Luxury']
  brands:         {
    liked:        [],           // ['Acronym', 'Rick Owens']
    blocked:      [],           // ['Supreme', 'Off-White']
  },
  priceRange:     { min: 0, max: 9999 },
  conditionTolerance: 'any',   // 'new_only' | 'like_new' | 'good' | 'any'
  mode:           'both',       // 'retail' | 'resale' | 'both'
  size:           'M',
  feedDepth:      0,            // pages viewed today (for metering)
  // Taste vector — populated from swipe calibration
  vector: {
    darkness:     50,
    technical:    50,
    formality:    50,
    archivePull:  50,
    brandLoyalty: 50,
  }
}

// ── Scoring weights ──
// Must add up to 100
const WEIGHTS = {
  aestheticMatch:  40,   // Do the listing's aesthetic tags match the user's?
  brandMatch:      25,   // Is the brand liked/neutral/blocked?
  priceInRange:    20,   // Is the price in their comfortable range?
  conditionMatch:  10,   // Does condition meet their tolerance?
  vectorAlignment:  5,   // Does the listing vibe with their taste vector?
}

/**
 * Score a single listing against a taste profile.
 * Returns { score: 0-100, breakdown: { ... } }
 */
export function scoreListingForProfile(listing, profile = DEFAULT_PROFILE) {

  const breakdown = {}

  // ── 1. Aesthetic match (40pts) ──
  const userAesthetics = new Set(profile.aesthetics)
  const listingAesthetics = listing.aesthetics || []

  if (userAesthetics.size === 0) {
    breakdown.aestheticMatch = WEIGHTS.aestheticMatch * 0.5  // neutral if no prefs yet
  } else {
    const overlap = listingAesthetics.filter(a => userAesthetics.has(a)).length
    const totalPossible = Math.max(userAesthetics.size, listingAesthetics.length, 1)
    breakdown.aestheticMatch = Math.round((overlap / totalPossible) * WEIGHTS.aestheticMatch)
  }

  // ── 2. Brand match (25pts) ──
  const brand = (listing.brand || '').toLowerCase()
  const liked   = (profile.brands?.liked || []).map(b => b.toLowerCase())
  const blocked = (profile.brands?.blocked || []).map(b => b.toLowerCase())

  if (blocked.some(b => brand.includes(b))) {
    // Blocked brand — hard zero, filtered out upstream but score it anyway
    breakdown.brandMatch = 0
  } else if (liked.some(b => brand.includes(b))) {
    breakdown.brandMatch = WEIGHTS.brandMatch
  } else {
    // Neutral brand — partial credit
    breakdown.brandMatch = Math.round(WEIGHTS.brandMatch * 0.5)
  }

  // ── 3. Price in range (20pts) ──
  const price   = listing.price || 0
  const { min, max } = profile.priceRange

  if (price >= min && price <= max) {
    // Full points — sweet spot
    breakdown.priceInRange = WEIGHTS.priceInRange
  } else if (price < min * 0.5 || price > max * 2) {
    // Way out of range
    breakdown.priceInRange = 0
  } else {
    // Somewhat out of range — partial
    breakdown.priceInRange = Math.round(WEIGHTS.priceInRange * 0.4)
  }

  // ── 4. Condition match (10pts) ──
  const conditionOrder = { new: 4, like_new: 3, good: 2, worn: 1, unknown: 0 }
  const toleranceMin = {
    new_only:  4,
    like_new:  3,
    good:      2,
    any:       0,
  }
  const minCondition = toleranceMin[profile.conditionTolerance] || 0
  const itemCondition = conditionOrder[listing.condition] ?? 0

  breakdown.conditionMatch = itemCondition >= minCondition
    ? WEIGHTS.conditionMatch
    : Math.round(WEIGHTS.conditionMatch * (itemCondition / 4))

  // ── 5. Vector alignment (5pts) ──
  // Simple placeholder — checks if darkness/technical vectors
  // align with aesthetic content of listing
  const v = profile.vector || DEFAULT_PROFILE.vector
  let vectorScore = 0

  if (listing.aesthetics?.includes('Dark Luxury') && v.darkness > 60)    vectorScore += 2
  if (listing.aesthetics?.includes('Gorpcore')    && v.technical > 60)   vectorScore += 2
  if (listing.aesthetics?.includes('Archive')     && v.archivePull > 60) vectorScore += 1

  breakdown.vectorAlignment = Math.min(vectorScore, WEIGHTS.vectorAlignment)

  // ── Total ──
  const total = Object.values(breakdown).reduce((sum, v) => sum + v, 0)
  const score = Math.min(Math.round(total), 100)

  return { score, breakdown }
}

/**
 * Score + sort a batch of listings for a given profile.
 * Filters out blocked brands and mode mismatches.
 * Returns listings sorted by score descending.
 */
function recencyNorm(listedAt) {
  if (!listedAt) return 0
  const t = Date.parse(listedAt)
  if (!Number.isFinite(t)) return 0
  const ageH = (Date.now() - t) / 3_600_000
  if (ageH <= 24) return 100
  if (ageH <= 24 * 7) return 55
  if (ageH <= 24 * 30) return 25
  return 0
}

export function rankListingsForProfile(listings, profile = DEFAULT_PROFILE, queries = []) {
  const blocked = (profile.brands?.blocked || []).map(b => b.toLowerCase())

  const filtered = listings
    .filter(l => {
      if (profile.mode === 'retail')  return l.isRetail
      if (profile.mode === 'resale')  return l.isResale
      return true
    })
    .filter(l => !blocked.some(b => (l.brand || '').toLowerCase().includes(b)))

  const withBm25 = scoreBm25(filtered, queries)

  return withBm25
    .map(l => {
      const taste = scoreListingForProfile(l, profile).score
      const bm25 = Math.round((l.bm25 || 0) * 100)
      const recency = recencyNorm(l.listedAt)
      const source = Math.round((SOURCE_QUALITY[l.source] ?? 0.5) * 100)
      const matchScore = Math.round(
        0.75 * taste + 0.10 * bm25 + 0.10 * recency + 0.05 * source
      )
      return { ...l, matchScore: Math.min(100, matchScore) }
    })
    .sort((a, b) => b.matchScore - a.matchScore)
}

/**
 * Update a taste profile based on a swipe action.
 * action: 'like' | 'dislike' | 'save'
 */
export function applySwipeFeedback(profile, listing, action) {
  const updated = JSON.parse(JSON.stringify(profile))  // deep clone

  const weight = action === 'save' ? 2 : action === 'like' ? 1 : -1

  // Update brand signals
  const brand = listing.brand
  updated.brands = updated.brands || { liked: [], blocked: [] }
  updated.brands.liked = updated.brands.liked || []
  updated.brands.blocked = updated.brands.blocked || []

  if (action === 'dislike') {
    if (!updated.brands.blocked.includes(brand)) {
      // Don't auto-block on one dislike — track frequency in production
    }
  } else {
    if (brand && !updated.brands.liked.includes(brand)) {
      updated.brands.liked.push(brand)
    }
  }

  // Update aesthetic weights
  for (const aesthetic of (listing.aesthetics || [])) {
    if (action === 'like' || action === 'save') {
      if (!updated.aesthetics.includes(aesthetic)) {
        updated.aesthetics.push(aesthetic)
      }
    }
  }

  // Nudge vector
  updated.vector = { ...DEFAULT_PROFILE.vector, ...(updated.vector || {}) }
  const v = updated.vector
  if (listing.aesthetics?.includes('Dark Luxury'))  v.darkness    = clamp(v.darkness    + weight * 3, 0, 100)
  if (listing.aesthetics?.includes('Gorpcore'))     v.technical   = clamp(v.technical   + weight * 3, 0, 100)
  if (listing.aesthetics?.includes('Archive'))      v.archivePull = clamp(v.archivePull + weight * 3, 0, 100)

  return updated
}

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max)
}
