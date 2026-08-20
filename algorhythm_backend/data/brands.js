/**
 * Brand Registry
 * Master list of brands with their aesthetic DNA.
 * Used to pre-seed search queries and aesthetic tagging.
 */

export const BRANDS = [
  // ── Gorpcore / Technical ──
  { name: "Acronym",              aesthetics: ["Gorpcore", "Technical", "Dark Luxury"],  tier: "high"   },
  { name: "Arc'teryx",            aesthetics: ["Gorpcore", "Technical"],                 tier: "high"   },
  { name: "Arc'teryx Veilance",   aesthetics: ["Gorpcore", "Technical", "Quiet Luxury"], tier: "high"   },
  { name: "Nemen",                aesthetics: ["Gorpcore", "Technical"],                 tier: "high"   },
  { name: "White Mountaineering", aesthetics: ["Gorpcore", "Technical"],                 tier: "mid"    },
  { name: "And Wander",           aesthetics: ["Gorpcore"],                              tier: "mid"    },
  { name: "Salomon",              aesthetics: ["Gorpcore"],                              tier: "mid"    },
  { name: "Nike ACG",             aesthetics: ["Gorpcore"],                              tier: "mid"    },
  { name: "Patagonia",            aesthetics: ["Gorpcore"],                              tier: "mid"    },
  { name: "Goldwin",              aesthetics: ["Gorpcore", "Technical", "Quiet Luxury"], tier: "mid"    },
  { name: "Houdini",              aesthetics: ["Gorpcore"],                              tier: "mid"    },

  // ── Dark Luxury ──
  { name: "Rick Owens",           aesthetics: ["Dark Luxury", "Avant-garde"],            tier: "high"   },
  { name: "Rick Owens DRKSHDW",   aesthetics: ["Dark Luxury"],                           tier: "mid"    },
  { name: "Julius",               aesthetics: ["Dark Luxury", "Avant-garde"],            tier: "high"   },
  { name: "Boris Bidjan Saberi",  aesthetics: ["Dark Luxury", "Technical"],              tier: "high"   },
  { name: "Carol Christian Poell",aesthetics: ["Dark Luxury", "Avant-garde"],            tier: "high"   },
  { name: "Guidi",                aesthetics: ["Dark Luxury", "Avant-garde"],            tier: "high"   },
  { name: "Isabel Benenato",      aesthetics: ["Dark Luxury"],                           tier: "high"   },
  { name: "Obscur",               aesthetics: ["Dark Luxury", "Technical"],              tier: "mid"    },
  { name: "Balenciaga",           aesthetics: ["Dark Luxury"],                           tier: "mid"    },

  // ── Avant-garde / Archive ──
  { name: "Yohji Yamamoto",       aesthetics: ["Avant-garde", "Archive"],                tier: "high"   },
  { name: "Comme des Garçons",    aesthetics: ["Avant-garde"],                           tier: "high"   },
  { name: "Issey Miyake",         aesthetics: ["Avant-garde"],                           tier: "high"   },
  { name: "Maison Margiela",      aesthetics: ["Avant-garde", "Quiet Luxury","Dark Luxury"],           tier: "high"   },

  // ── Quiet Luxury / Refined ──
  { name: "Lemaire",              aesthetics: ["Quiet Luxury"],                          tier: "high"   },
  { name: "Margaret Howell",      aesthetics: ["Quiet Luxury"],                          tier: "mid"    },
  { name: "Our Legacy",           aesthetics: ["Quiet Luxury"],                          tier: "mid"    },
  { name: "Norse Projects",       aesthetics: ["Quiet Luxury"],                          tier: "mid"    },

  // ── Workwear / Utility ──
  { name: "Engineered Garments",  aesthetics: ["Workwear"],                              tier: "mid"    },
  { name: "Needles",              aesthetics: ["Workwear", "Archive"],                   tier: "mid"    },
  { name: "Carhartt WIP",         aesthetics: ["Workwear"],                              tier: "entry"  },
  { name: "Universal Works",      aesthetics: ["Workwear", "Quiet Luxury"],              tier: "entry"  },
]

/**
 * Get brands matching a given aesthetic.
 */
export function getBrandsByAesthetic(aesthetic) {
  return BRANDS.filter(b => b.aesthetics.includes(aesthetic))
}

/**
 * Build eBay search queries for a taste profile.
 * Returns an array of { query, aesthetic } objects.
 */
export function buildSearchQueriesForProfile(profile) {
  const queries = []

  for (const aesthetic of profile.aesthetics) {
    const brands = getBrandsByAesthetic(aesthetic)
    for (const brand of brands) {
      // Skip blocked brands
      if ((profile.brands?.blocked || []).some(b =>
        b.toLowerCase() === brand.name.toLowerCase()
      )) continue

      queries.push({ query: brand.name, aesthetic, brand: brand.name })
    }
  }

  // Add explicit liked brands not already covered
  for (const brand of (profile.brands?.liked || [])) {
    if (!queries.some(q => q.brand === brand)) {
      queries.push({ query: brand, aesthetic: 'liked', brand })
    }
  }

  return queries
}
