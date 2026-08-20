import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getLocalCatalog, searchLocalCatalog } from '../data/localCatalog.js'
import { rankListingsForProfile, applySwipeFeedback, DEFAULT_PROFILE } from '../utils/tasteScorer.js'
import { compareListing, compareQuery } from '../utils/priceCompare.js'

test('local catalog covers retail and resale listings', () => {
  const items = getLocalCatalog()
  assert.ok(items.length >= 30)
  assert.ok(items.some(i => i.isRetail))
  assert.ok(items.some(i => i.isResale))
  assert.ok(items.every(i => i.id && i.brand && i.name && typeof i.price === 'number'))
})

test('searchLocalCatalog matches brand queries used in onboarding', () => {
  const { items, total } = searchLocalCatalog({ query: 'Acronym jacket', limit: 5 })
  assert.ok(total >= 1)
  assert.ok(items.every(i => /acronym/i.test(`${i.brand} ${i.name}`)))
})

test('ranked feed prefers selected aesthetics and stays in budget', () => {
  const profile = {
    ...DEFAULT_PROFILE,
    aesthetics: ['Gorpcore'],
    priceRange: { min: 0, max: 500 },
    brands: { liked: [], blocked: [] },
    mode: 'both',
  }

  const ranked = rankListingsForProfile(getLocalCatalog(), profile)
  assert.ok(ranked.length > 0)
  assert.ok(ranked[0].matchScore >= ranked[ranked.length - 1].matchScore)
  assert.ok(ranked[0].aesthetics.includes('Gorpcore'))
})

test('mode filter separates retail from resale', () => {
  const retail = rankListingsForProfile(getLocalCatalog(), { ...DEFAULT_PROFILE, mode: 'retail' })
  const resale = rankListingsForProfile(getLocalCatalog(), { ...DEFAULT_PROFILE, mode: 'resale' })
  assert.ok(retail.length > 0 && retail.every(i => i.isRetail))
  assert.ok(resale.length > 0 && resale.every(i => i.isResale))
})

test('swipe like adds brand and aesthetic to the profile', () => {
  const listing = getLocalCatalog().find(i => i.brand === 'Acronym')
  const updated = applySwipeFeedback(DEFAULT_PROFILE, listing, 'like')
  assert.ok(updated.brands.liked.includes('Acronym'))
  assert.ok(updated.aesthetics.some(a => listing.aesthetics.includes(a)))
})

test('swipe works when the incoming profile omits vector and brands', () => {
  const listing = getLocalCatalog().find(i => i.brand === 'Acronym')
  const updated = applySwipeFeedback({ aesthetics: ['Gorpcore'] }, listing, 'like')
  assert.ok(updated.brands.liked.includes('Acronym'))
  assert.equal(typeof updated.vector.technical, 'number')
})

test('compare groups same-brand listings and returns market stats', () => {
  const catalog = getLocalCatalog()
  const source = catalog.find(i => i.brand === 'Nemen')
  const result = compareListing(source, catalog, 10)

  assert.equal(result.source.id, source.id)
  assert.ok(result.stats.count >= 2)
  assert.ok(['great', 'good', 'fair', 'high', 'unknown'].includes(result.stats.dealScore))
  const matches = Object.values(result.grouped).flat()
  assert.ok(matches.length >= 1)
  assert.ok(matches.every(i => i.brand === 'Nemen'))
  assert.ok(typeof matches[0].priceDelta === 'number')
})

test('compareQuery finds a source from free text', () => {
  const result = compareQuery('Nemen jacket army green', getLocalCatalog(), 10)
  assert.ok(result)
  assert.match(result.source.brand, /Nemen/i)
})
