import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import axios from 'axios'
import { resetCache } from '../services/httpCache.js'
import {
  getEbayToken,
  resetEbayTokenCache,
  searchEbay,
} from '../services/ebayService.js'
import { searchLukes } from '../services/lukesService.js'

const origPost = axios.post
const origGet = axios.get

afterEach(() => {
  axios.post = origPost
  axios.get = origGet
  resetEbayTokenCache()
  resetCache()
  delete process.env.EBAY_ENV
  delete process.env.EBAY_CLIENT_ID
  delete process.env.EBAY_CLIENT_SECRET
  delete process.env.LUKES_ENABLED
})

test('eBay Production token and Browse URLs are used when EBAY_ENV=PRODUCTION', async () => {
  process.env.EBAY_ENV = 'PRODUCTION'
  process.env.EBAY_CLIENT_ID = 'prod-id'
  process.env.EBAY_CLIENT_SECRET = 'prod-secret'
  resetEbayTokenCache()

  axios.post = async (url) => {
    assert.match(String(url), /^https:\/\/api\.ebay\.com\/identity\/v1\/oauth2\/token$/)
    assert.doesNotMatch(String(url), /sandbox/)
    return { data: { access_token: 'prod-token', expires_in: 7200 } }
  }
  axios.get = async (url, opts) => {
    assert.match(String(url), /^https:\/\/api\.ebay\.com\/buy\/browse\/v1\/item_summary\/search$/)
    assert.equal(opts.headers.Authorization, 'Bearer prod-token')
    return { status: 200, data: { itemSummaries: [{ itemId: '1' }] } }
  }

  const token = await getEbayToken()
  assert.equal(token, 'prod-token')
  const data = await searchEbay({ query: 'Acronym jacket', limit: 2 })
  assert.equal(data.itemSummaries[0].itemId, '1')
})

test("Luke's products.json search matches tokens when enabled", async () => {
  process.env.LUKES_ENABLED = 'true'
  axios.get = async (url) => {
    assert.match(String(url), /lukes\.store\/collections\/all\/products\.json/)
    return {
      status: 200,
      data: {
        products: [
          { id: 1, title: 'Ramones', vendor: 'Rick Owens', tags: ['leather'] },
          { id: 2, title: 'Alpha SV', vendor: "Arc'teryx", tags: ['shell'] },
        ],
      },
    }
  }
  const hits = await searchLukes({ query: 'Rick Owens Ramones', limit: 5 })
  assert.equal(hits.length, 1)
  assert.equal(hits[0].vendor, 'Rick Owens')
})
