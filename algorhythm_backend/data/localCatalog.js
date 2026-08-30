/**
 * Local listing catalog.
 *
 * Used so the core loop (onboard → ranked feed → compare) works without
 * live eBay credentials or sandbox inventory. Items already match ListingSchema
 * from utils/normalizer.js.
 */

function listing({
  id,
  source = 'ebay',
  brand,
  name,
  price,
  condition = 'like_new',
  aesthetics,
}) {
  const isRetail = source === 'ssense'
  const q = encodeURIComponent(`${brand} ${name}`)

  return {
    id: `${source}:${id}`,
    source,
    source_label: isRetail ? 'SSENSE' : 'eBay',
    brand,
    name,
    price,
    currency: 'USD',
    condition,
    images: [],
    url: isRetail
      ? `https://www.ssense.com/en-us/search?q=${q}`
      : `https://www.ebay.com/sch/i.html?_nkw=${q}`,
    aesthetics,
    isResale: !isRetail,
    isRetail,
    listedAt: null,
    endsAt: null,
    availability: 'in_stock',
  }
}

export const LOCAL_LISTINGS = [
  // ── Gorpcore / Technical ──
  listing({ id: 'acr-j1a', brand: 'Acronym', name: 'J1A-GT Interops Jacket Black', price: 890, aesthetics: ['Gorpcore', 'Technical', 'Dark Luxury'] }),
  listing({ id: 'acr-p10', brand: 'Acronym', name: 'P10-DS Cargo Pants', price: 620, condition: 'good', aesthetics: ['Gorpcore', 'Technical'] }),
  listing({ id: 'acr-ssense', source: 'ssense', brand: 'Acronym', name: 'J1W-GT Windstopper Jacket', price: 1240, condition: 'new', aesthetics: ['Gorpcore', 'Technical'] }),
  listing({ id: 'arc-beta', brand: "Arc'teryx", name: 'Beta AR Jacket Black', price: 380, aesthetics: ['Gorpcore', 'Technical'] }),
  listing({ id: 'arc-atom', brand: "Arc'teryx", name: 'Atom LT Hoody Forage', price: 210, condition: 'good', aesthetics: ['Gorpcore'] }),
  listing({ id: 'arc-ssense', source: 'ssense', brand: "Arc'teryx", name: 'Alpha SV Jacket', price: 799, condition: 'new', aesthetics: ['Gorpcore', 'Technical'] }),
  listing({ id: 'veil-cape', brand: "Arc'teryx Veilance", name: 'Monitor IS Coat Black', price: 920, aesthetics: ['Gorpcore', 'Technical', 'Quiet Luxury'] }),
  listing({ id: 'veil-ssense', source: 'ssense', brand: "Arc'teryx Veilance", name: 'Partition LT Coat', price: 1100, condition: 'new', aesthetics: ['Gorpcore', 'Quiet Luxury'] }),
  listing({ id: 'nemen-field', brand: 'Nemen', name: 'Field Jacket Army Green', price: 340, aesthetics: ['Gorpcore', 'Technical'] }),
  listing({ id: 'nemen-over', brand: 'Nemen', name: 'Overshirt Ripstop Black', price: 280, condition: 'good', aesthetics: ['Gorpcore', 'Technical'] }),
  listing({ id: 'wm-coat', brand: 'White Mountaineering', name: 'Gore-Tex Mountain Parka', price: 450, aesthetics: ['Gorpcore', 'Technical'] }),
  listing({ id: 'wander-shirt', brand: 'And Wander', name: 'Pertex Wind Shirt', price: 190, aesthetics: ['Gorpcore'] }),
  listing({ id: 'salomon-xt', brand: 'Salomon', name: 'XT-6 Trail Sneaker Black', price: 145, aesthetics: ['Gorpcore'] }),
  listing({ id: 'acg-jacket', brand: 'Nike ACG', name: 'ACG Gore-Tex Jacket', price: 220, aesthetics: ['Gorpcore'] }),
  listing({ id: 'patagonia-nano', brand: 'Patagonia', name: 'Nano Puff Jacket Forge Grey', price: 160, condition: 'good', aesthetics: ['Gorpcore'] }),
  listing({ id: 'goldwin-down', brand: 'Goldwin', name: 'Down Coat Neutral', price: 410, aesthetics: ['Gorpcore', 'Technical', 'Quiet Luxury'] }),
  listing({ id: 'houdini-mr', brand: 'Houdini', name: 'Moonwalk Jacket', price: 240, aesthetics: ['Gorpcore'] }),
  listing({ id: 'stone-ghost', brand: 'Stone Island', name: 'Ghost Piece Softshell', price: 390, aesthetics: ['Gorpcore', 'Technical'] }),

  // ── Dark Luxury ──
  listing({ id: 'ro-geo', brand: 'Rick Owens', name: 'Geo Basket Sneaker Black', price: 680, aesthetics: ['Dark Luxury', 'Avant-garde'] }),
  listing({ id: 'ro-jacket', brand: 'Rick Owens', name: 'Leather Bauhaus Jacket', price: 2100, aesthetics: ['Dark Luxury', 'Avant-garde'] }),
  listing({ id: 'ro-ssense', source: 'ssense', brand: 'Rick Owens', name: 'DRKSHDW Jumbo Hoodie', price: 890, condition: 'new', aesthetics: ['Dark Luxury'] }),
  listing({ id: 'drk-pants', brand: 'Rick Owens DRKSHDW', name: 'Prisoner Drawstring Pants', price: 320, condition: 'good', aesthetics: ['Dark Luxury'] }),
  listing({ id: 'julius-coat', brand: 'Julius', name: 'Gasmask Coat Black', price: 980, aesthetics: ['Dark Luxury', 'Avant-garde'] }),
  listing({ id: 'bbs-pants', brand: 'Boris Bidjan Saberi', name: 'P13 Object Dyed Pants', price: 740, aesthetics: ['Dark Luxury', 'Technical'] }),
  listing({ id: 'guidi-backzip', brand: 'Guidi', name: '788 Backzip Boot', price: 1450, aesthetics: ['Dark Luxury', 'Avant-garde'] }),
  listing({ id: 'ccp-jacket', brand: 'Carol Christian Poell', name: 'Object Dyed Leather Jacket', price: 3200, aesthetics: ['Dark Luxury', 'Avant-garde'] }),
  listing({ id: 'benenato-knit', brand: 'Isabel Benenato', name: 'Destroyed Knit Sweater', price: 410, aesthetics: ['Dark Luxury'] }),
  listing({ id: 'obscur-shell', brand: 'Obscur', name: 'Technical Shell Black', price: 360, aesthetics: ['Dark Luxury', 'Technical'] }),
  listing({ id: 'balenciaga-3xl', brand: 'Balenciaga', name: '3XL Sneaker Worn Black', price: 790, aesthetics: ['Dark Luxury'] }),

  // ── Avant-garde / Archive ──
  listing({ id: 'yohji-coat', brand: 'Yohji Yamamoto', name: 'Asymmetric Wool Coat AW archive', price: 1600, aesthetics: ['Avant-garde', 'Archive'] }),
  listing({ id: 'yohji-ssense', source: 'ssense', brand: 'Yohji Yamamoto', name: 'Black Gabardine Jacket', price: 1890, condition: 'new', aesthetics: ['Avant-garde'] }),
  listing({ id: 'cdg-shirt', brand: 'Comme des Garçons', name: 'Deconstructed Shirt', price: 280, aesthetics: ['Avant-garde'] }),
  listing({ id: 'miyake-pleats', brand: 'Issey Miyake', name: 'Pleats Please Coat', price: 540, aesthetics: ['Avant-garde'] }),
  listing({ id: 'mm-replica', brand: 'Maison Margiela', name: 'Replica Sneaker White', price: 420, aesthetics: ['Avant-garde', 'Quiet Luxury', 'Dark Luxury'] }),
  listing({ id: 'mm-coat', source: 'ssense', brand: 'Maison Margiela', name: 'Recycled Nylon Coat', price: 1650, condition: 'new', aesthetics: ['Avant-garde', 'Dark Luxury'] }),

  // ── Quiet Luxury ──
  listing({ id: 'lemaire-coat', brand: 'Lemaire', name: 'Twisted Belted Coat', price: 890, aesthetics: ['Quiet Luxury'] }),
  listing({ id: 'lemaire-ssense', source: 'ssense', brand: 'Lemaire', name: 'Relaxed Trouser Sand', price: 620, condition: 'new', aesthetics: ['Quiet Luxury'] }),
  listing({ id: 'mh-shirt', brand: 'Margaret Howell', name: 'Linen Shirt Neutral', price: 210, aesthetics: ['Quiet Luxury'] }),
  listing({ id: 'ol-jacket', brand: 'Our Legacy', name: 'Evening Coat', price: 540, aesthetics: ['Quiet Luxury'] }),
  listing({ id: 'norse-knit', brand: 'Norse Projects', name: 'Merino Knit Crew', price: 160, condition: 'good', aesthetics: ['Quiet Luxury'] }),

  // ── Workwear / Archive ──
  listing({ id: 'eg-bb', brand: 'Engineered Garments', name: 'Bedford Jacket Olive', price: 280, aesthetics: ['Workwear'] }),
  listing({ id: 'eg-ssense', source: 'ssense', brand: 'Engineered Garments', name: 'Fatigue Pant', price: 340, condition: 'new', aesthetics: ['Workwear'] }),
  listing({ id: 'needles-track', brand: 'Needles', name: 'Track Jacket Purple Archive', price: 260, aesthetics: ['Workwear', 'Archive'] }),
  listing({ id: 'needles-ssense', source: 'ssense', brand: 'Needles', name: 'Track Pant', price: 295, condition: 'new', aesthetics: ['Workwear', 'Archive'] }),
  listing({ id: 'carhartt-chore', brand: 'Carhartt WIP', name: 'Michigan Chore Coat Hamilton Brown', price: 120, condition: 'good', aesthetics: ['Workwear'] }),
  listing({ id: 'carhartt-detroit', brand: 'Carhartt WIP', name: 'Detroit Jacket Black', price: 140, aesthetics: ['Workwear'] }),
  listing({ id: 'uw-shirt', brand: 'Universal Works', name: 'Bakers Overshirt Canvas', price: 165, aesthetics: ['Workwear', 'Quiet Luxury'] }),
]

/**
 * Search the local catalog by free-text query and optional filters.
 */
export function searchLocalCatalog({
  query = '',
  limit = 20,
  offset = 0,
  priceMin = null,
  priceMax = null,
  mode = null,
} = {}) {
  const q = query.trim().toLowerCase()
  const tokens = q ? q.split(/\s+/).filter(Boolean) : []

  let items = LOCAL_LISTINGS.filter(item => {
    if (priceMin != null && item.price < priceMin) return false
    if (priceMax != null && item.price > priceMax) return false
    if (mode === 'retail' && !item.isRetail) return false
    if (mode === 'resale' && !item.isResale) return false
    if (!tokens.length) return true

    const hay = `${item.brand} ${item.name} ${item.aesthetics.join(' ')}`.toLowerCase()
    return tokens.every(t => hay.includes(t))
  })

  const total = items.length
  items = items.slice(offset, offset + limit)
  return { items, total }
}

export function getLocalCatalog() {
  return LOCAL_LISTINGS
}
