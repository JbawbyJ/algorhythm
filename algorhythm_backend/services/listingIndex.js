/**
 * In-memory listing index keyed by source:itemId.
 * Pagination reads this store, not a fresh vendor burst.
 */

const items = new Map()

export function upsert(listings = []) {
  for (const listing of listings) {
    if (!listing?.id) continue
    items.set(listing.id, { ...listing, indexedAt: new Date().toISOString() })
  }
  return items.size
}

export function dropSource(source) {
  for (const [id, listing] of items) {
    if (listing.source === source) items.delete(id)
  }
}

export function candidates(filterFn) {
  const all = [...items.values()]
  return typeof filterFn === 'function' ? all.filter(filterFn) : all
}

export function resetIndex() {
  items.clear()
}

export function size() {
  return items.size
}

export const listingIndex = { upsert, dropSource, candidates, reset: resetIndex, size }
