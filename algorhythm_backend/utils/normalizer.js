/**
 * Listing Normalizer
 *
 * Every data source (eBay, Yahoo Japan, SSENSE affiliate, etc.)
 * returns data in its own format. This normalizer converts everything
 * into a single standard ListingSchema so the rest of the app
 * doesn't care where data came from.
 *
 * Standard ListingSchema:
 * {
 *   id:           string    — source:itemId (e.g. "ebay:123456")
 *   source:       string    — 'ebay' | 'yahoo_jp' | 'ssense' | 'grailed' | 'lukes' | 'hbx'
 *   brand:        string    — normalized brand name
 *   name:         string    — item title/name
 *   price:        number    — price in USD
 *   currency:     string    — 'USD' | 'JPY' etc
 *   condition:    string    — 'new' | 'like_new' | 'good' | 'worn'
 *   images:       string[]  — array of image URLs
 *   url:          string    — link to original listing
 *   source_label: string    — display label ('Grailed', 'SSENSE', 'Yahoo Japan')
 *   aesthetics:   string[]  — detected aesthetic tags
 *   isResale:     boolean
 *   isRetail:     boolean
 *   listedAt:     string|null
 *   endsAt:       string|null
 *   availability: string|null
 *   raw:          object    — original response (for debugging)
 * }
 */

import { toUsd } from '../services/fx.js'

// ── Brand normalization map ──
// Handles typos, alternate spellings, case differences
const BRAND_MAP = {
  "arc'teryx":        "Arc'teryx",
  "arcteryx":         "Arc'teryx",
  "arc teryx":        "Arc'teryx",
  "Balenciaga":       "Balenciaga",
  "veilance":         "Arc'teryx Veilance",
  "vetements":       "vetements",
  "rick owens":       "Rick Owens",
  "rick owens drkshdw": "Rick Owens DRKSHDW",
  "drkshdw":          "Rick Owens DRKSHDW",
  "acronym":          "Acronym",
  "julius":           "Julius",
  "yohji yamamoto":   "Yohji Yamamoto",
  "y-3":              "Y-3",
  "comme des garcons":"Comme des Garçons",
  "cdg":              "Comme des Garçons",
  "stone island":     "Stone Island",
  "cp company":       "C.P. Company",
  "c.p. company":     "C.P. Company",
  "hbx":              "HBX",
  "ssense":           "SSENSE",
  "needles":          "Needles",
  "engineered garments": "Engineered Garments",
  "eg":               "Engineered Garments",
  "nemen":            "Nemen",
  "white mountaineering": "White Mountaineering",
  "nike acg":         "Nike ACG",
  "salomon":          "Salomon",
  "and wander":       "And Wander",
  "patagonia":        "Patagonia",
  "goldwin":          "Goldwin",
  "houdini":          "Houdini",
  "boris bidjan saberi": "Boris Bidjan Saberi",
  "bbs":              "Boris Bidjan Saberi",
  "carol christian poell": "Carol Christian Poell",
  "ccp":              "Carol Christian Poell",
  "guidi":            "Guidi",
  "isabel benenato":  "Isabel Benenato",
  "obscur":           "Obscur",
  "issey miyake":     "Issey Miyake",
  "maison margiela":  "Maison Margiela",
  "margiela":         "Maison Margiela",
  "mm6":              "Maison Margiela",
  "lemaire":          "Lemaire",
  "margaret howell":  "Margaret Howell",
  "our legacy":       "Our Legacy",
  "norse projects":   "Norse Projects",
  "carhartt wip":     "Carhartt WIP",
  "universal works":  "Universal Works",
}

/**
 * Detect aesthetic tags from listing title + brand.
 * This is a simple keyword-based approach for now —
 * in production this gets replaced with an LLM call.
 */
const AESTHETIC_RULES = [
  { tags: ['Gorpcore'],   keywords: ["gore-tex", "gore tex", "goretex", "shell", "softshell", "fleece", "acg", "trail", "mountain", "technical", "ripstop", "pertex", "polartec", "windstopper", "veilance", "arc'teryx", "arcteryx", "and wander", "salomon", "nemen", "white mountaineering", "patagonia", "goldwin", "houdini"] },
  { tags: ['Dark Luxury'],keywords: ["rick owens", "julius", "obscur", "black", "drkshdw", "waxed", "leather", "elongated", "asymmetric", "dark", "void", "boris bidjan saberi", "bbs", "carol christian poell", "ccp", "guidi", "isabel benenato", "balenciaga", "maison margiela", "margiela"] },
  { tags: ['Avant-garde'],keywords: ["yohji", "comme des garcons", "cdg", "issey miyake", "pleats please", "deconstructed", "asymmetric", "abstract", "experimental", "maison margiela", "margiela", "carol christian poell"] },
  { tags: ['Archive'],    keywords: ["archive", "vintage", "aw", "ss", "fw", "deadstock", "ds", "sample", "rare", "htf", "grail"] },
  { tags: ['Technical'],  keywords: ["acronym", "schoeller", "d30", "gore-tex", "polartec", "windstopper", "tech", "utility", "modular", "tactical"] },
  { tags: ['Quiet Luxury'],keywords: ["loro piana", "brunello", "kiton", "zegna", "cashmere", "merino", "linen", "neutral", "minimalist", "lemaire", "margaret howell", "our legacy", "norse projects", "goldwin"] },
  { tags: ['Workwear'],   keywords: ["carhartt", "engineered garments", "universal works", "dickies", "canvas", "duck", "chore", "coverall", "denim", "needles"] },
]

function detectAesthetics(title = '', brand = '') {
  const text = `${title} ${brand}`.toLowerCase()
  const found = new Set()

  for (const rule of AESTHETIC_RULES) {
    if (rule.keywords.some(kw => text.includes(kw))) {
      rule.tags.forEach(t => found.add(t))
    }
  }

  return found.size > 0 ? [...found] : ['General']
}

function normalizeBrand(raw = '') {
  const key = raw.toLowerCase().trim()
  return BRAND_MAP[key] || raw.trim()
}

function normalizeCondition(raw = '') {
  const r = raw.toLowerCase()
  if (r.includes('new') && !r.includes('like'))    return 'new'
  if (r.includes('like new') || r.includes('mint')) return 'like_new'
  if (r.includes('good') || r.includes('very good')) return 'good'
  if (r.includes('acceptable') || r.includes('fair')) return 'worn'
  return 'unknown'
}

// ── eBay normalizer ──
export function normalizeEbayItem(item) {
  const brand = normalizeBrand(
    item.localizedAspects?.find(a => a.name === 'Brand')?.value ||
    item.brand ||
    extractBrandFromTitle(item.title || '')
  )

  const price = parseFloat(item.price?.value || 0)

  return {
    id:           `ebay:${item.itemId}`,
    source:       'ebay',
    source_label: 'eBay',
    brand,
    name:         item.title || '',
    price,
    currency:     item.price?.currency || 'USD',
    condition:    normalizeCondition(item.condition || ''),
    images:       item.thumbnailImages?.map(i => i.imageUrl) ||
                  (item.image?.imageUrl ? [item.image.imageUrl] : []),
    url:          item.itemWebUrl || item.itemAffiliateWebUrl || '',
    aesthetics:   detectAesthetics(item.title, brand),
    isResale:     true,
    isRetail:     false,
    listedAt:     item.itemCreationDate || item.listingDate || null,
    endsAt:       item.itemEndDate || null,
    availability: item.availability || item.availabilityStatus || null,
    raw:          item
  }
}

// ── SSENSE normalizer (affiliate feed) — placeholder structure ──
export function normalizeSsenseItem(item) {
  const brand = normalizeBrand(item.designer || item.brand || '')
  return {
    id:           `ssense:${item.sku || item.id}`,
    source:       'ssense',
    source_label: 'SSENSE',
    brand,
    name:         item.name || item.title || '',
    price:        parseFloat(item.price || 0),
    currency:     'USD',
    condition:    'new',
    images:       item.images || (item.imageUrl ? [item.imageUrl] : []),
    url:          item.url || item.productUrl || '',
    aesthetics:   detectAesthetics(item.name, brand),
    isResale:     false,
    isRetail:     true,
    listedAt:     item.listedAt || item.published_at || null,
    endsAt:       null,
    availability: item.availability || 'in_stock',
    raw:          item
  }
}

export function normalizeLukesItem(product) {
  const variant = (product.variants && product.variants[0]) || {}
  const brand = normalizeBrand(product.vendor || '')
  const name = product.title || ''
  const price = parseFloat(variant.price || product.price || 0)
  const image = product.images?.[0]?.src || product.image?.src
  return {
    id:           `lukes:${product.id || product.handle}`,
    source:       'lukes',
    source_label: "Luke's NYC",
    brand,
    name,
    price,
    currency:     'USD',
    condition:    'good',
    images:       image ? [image] : [],
    url:          product.handle ? `https://lukes.store/products/${product.handle}` : (product.url || ''),
    aesthetics:   detectAesthetics(name, brand),
    isResale:     true,
    isRetail:     false,
    listedAt:     product.published_at || product.created_at || null,
    endsAt:       null,
    availability: variant.available === false ? 'sold' : 'in_stock',
    raw:          product
  }
}

export function normalizeHbxItem(item) {
  const brand = normalizeBrand(item.brand || item.designer || '')
  const name = item.name || item.title || ''
  const archive = Boolean(item.archive || item.isArchive || /archive/i.test(item.collection || ''))
  return {
    id:           `hbx:${item.sku || item.id || name}`,
    source:       'hbx',
    source_label: 'HBX',
    brand,
    name,
    price:        parseFloat(item.price || 0),
    currency:     item.currency || 'USD',
    condition:    archive ? 'good' : 'new',
    images:       item.images || (item.imageUrl ? [item.imageUrl] : []),
    url:          item.url || item.productUrl || '',
    aesthetics:   detectAesthetics(name, brand),
    isResale:     archive,
    isRetail:     !archive,
    listedAt:     item.listedAt || null,
    endsAt:       null,
    availability: item.availability || null,
    raw:          item
  }
}

export function normalizeGrailedItem(item) {
  const brand = normalizeBrand(item.brand || extractBrandFromTitle(item.name || item.title || ''))
  const name = item.name || item.title || ''
  return {
    id:           `grailed:${item.id || item.url || name}`,
    source:       'grailed',
    source_label: 'Grailed',
    brand,
    name,
    price:        parseFloat(item.price || 0),
    currency:     item.currency || 'USD',
    condition:    normalizeCondition(item.condition || 'good'),
    images:       item.images || [],
    url:          item.url || '',
    aesthetics:   detectAesthetics(name, brand),
    isResale:     true,
    isRetail:     false,
    listedAt:     item.listedAt || null,
    endsAt:       null,
    availability: item.availability || null,
    raw:          item
  }
}

// ── Yahoo Japan normalizer — placeholder structure ──
export function normalizeYahooJpItem(item) {
  const brand = normalizeBrand(item.brand || extractBrandFromTitle(item.title || ''))
  return {
    id:           `yahoojp:${item.auctionID || item.id}`,
    source:       'yahoo_jp',
    source_label: 'Yahoo Japan',
    brand,
    name:         item.title || '',
    price:        toUsd(
      parseFloat(item.currentPrice?.value || item.price || 0),
      item.currentPrice?.currency || item.currency || 'JPY'
    ),
    currency:     'USD',
    condition:    normalizeCondition(item.condition || ''),
    images:       item.images || (item.imageUrl ? [item.imageUrl] : []),
    url:          item.aucviewUrl || item.url || '',
    aesthetics:   detectAesthetics(item.title, brand),
    isResale:     true,
    isRetail:     false,
    listedAt:     item.listedAt || null,
    endsAt:       item.endTime || item.endsAt || null,
    availability: item.availability || null,
    raw:          item
  }
}

/**
 * Try to pull a brand name out of a listing title.
 * Rough heuristic — checks if first 1-3 words match known brands.
 */
function extractBrandFromTitle(title = '') {
  const words = title.toLowerCase().split(' ')
  for (let len = 3; len >= 1; len--) {
    const candidate = words.slice(0, len).join(' ')
    if (BRAND_MAP[candidate]) return BRAND_MAP[candidate]
  }
  return words[0] || 'Unknown'
}

// ── Normalize a batch from any source ──
export function normalizeBatch(items, source) {
  const normalizers = {
    ebay:     normalizeEbayItem,
    ssense:   normalizeSsenseItem,
    yahoo_jp: normalizeYahooJpItem,
    lukes:    normalizeLukesItem,
    hbx:      normalizeHbxItem,
    grailed:  normalizeGrailedItem,
  }
  const fn = normalizers[source]
  if (!fn) throw new Error(`Unknown source: ${source}`)
  return items.map(fn)
}
