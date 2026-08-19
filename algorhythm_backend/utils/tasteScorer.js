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
export function rankListingsForProfile(listings, profile = DEFAULT_PROFILE) {
  const blocked = (profile.brands?.blocked || []).map(b => b.toLowerCase())

  return listings
    // Filter by mode
    .filter(l => {
      if (profile.mode === 'retail')  return l.isRetail
      if (profile.mode === 'resale')  return l.isResale
      return true
    })
    // Filter out hard-blocked brands
    .filter(l => !blocked.some(b => (l.brand || '').toLowerCase().includes(b)))
    // Score each
    .map(l => ({ ...l, matchScore: scoreListingForProfile(l, profile).score }))
    // Sort by score
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
  const v = updated.vector
  if (listing.aesthetics?.includes('Dark Luxury'))  v.darkness    = clamp(v.darkness    + weight * 3, 0, 100)
  if (listing.aesthetics?.includes('Gorpcore'))     v.technical   = clamp(v.technical   + weight * 3, 0, 100)
  if (listing.aesthetics?.includes('Archive'))      v.archivePull = clamp(v.archivePull + weight * 3, 0, 100)

  return updated
}

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max)
}
