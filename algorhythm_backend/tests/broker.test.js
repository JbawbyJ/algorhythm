import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cacheSet, cacheGet, cacheKey, resetCache, shouldStoreStatus } from '../services/httpCache.js'
import { listingIndex } from '../services/listingIndex.js'
import { searchAll, setTestAdapters, liveConfigured, allowLocalCatalog } from '../services/sourceBroker.js'
import { normalizeLukesItem, normalizeGrailedItem, normalizeHbxItem } from '../utils/normalizer.js'
import { getLocalCatalog } from '../data/localCatalog.js'

test('cache refuses to store 429', () => {
  resetCache()
  const key = cacheKey('GET', 'https://api.ebay.com/search')
  assert.equal(shouldStoreStatus(429), false)
  cacheSet(key, { bad: true }, 60_000, { status: 429 })
  assert.equal(cacheGet(key), null)
})

test('live-first fake source does not need the local catalog', async () => {
  listingIndex.reset()
  setTestAdapters([
    {
      id: 'ebay',
      enabled: () => true,
      search: async () => ([
        {
          id: 'ebay:live-1',
          source: 'ebay',
          brand: 'Acronym',
          name: 'J1A live',
          price: 800,
          isResale: true,
          isRetail: false,
          aesthetics: ['Gorpcore'],
        },
      ]),
    },
  ])
  assert.equal(liveConfigured(), true)
  assert.equal(allowLocalCatalog(), false)
  const { items, sources } = await searchAll([{ query: 'Acronym', brand: 'Acronym' }])
  assert.deepEqual(sources, ['ebay'])
  assert.equal(items[0].id, 'ebay:live-1')
  assert.ok(!items.some(i => getLocalCatalog().some(l => l.id === i.id)))
  setTestAdapters(null)
})

test('broker isolates a failing source', async () => {
  setTestAdapters([
    {
      id: 'ebay',
      enabled: () => true,
      search: async () => { throw new Error('boom') },
    },
    {
      id: 'lukes',
      enabled: () => true,
      search: async () => ([{
        id: 'lukes:1', source: 'lukes', brand: 'Rick Owens', name: 'Ramones',
        price: 700, isResale: true, isRetail: false, aesthetics: ['Dark Luxury'],
      }]),
    },
  ])
  const { items, sources } = await searchAll([{ query: 'Rick Owens' }])
  assert.ok(sources.includes('lukes'))
  assert.ok(!sources.includes('ebay'))
  assert.equal(items[0].source, 'lukes')
  setTestAdapters(null)
})

test('lukes / grailed / hbx normalizers emit schema timestamps', () => {
  const lukes = normalizeLukesItem({
    id: 9,
    handle: 'ramones',
    title: 'Ramones',
    vendor: 'Rick Owens',
    published_at: '2026-01-01T00:00:00Z',
    variants: [{ price: '720.00', available: true }],
  })
  assert.equal(lukes.source, 'lukes')
  assert.equal(lukes.listedAt, '2026-01-01T00:00:00Z')
  assert.equal(lukes.isResale, true)

  const grailed = normalizeGrailedItem({
    id: 'g1', name: 'Acronym J1A', brand: 'Acronym', price: 500, listedAt: '2026-02-01',
  })
  assert.equal(grailed.source, 'grailed')
  assert.ok(grailed.listedAt)

  const hbx = normalizeHbxItem({
    id: 'h1', name: 'Alpha SV', brand: "Arc'teryx", price: 799, archive: true,
  })
  assert.equal(hbx.source, 'hbx')
  assert.equal(hbx.isResale, true)
  assert.equal(hbx.isRetail, false)
})
