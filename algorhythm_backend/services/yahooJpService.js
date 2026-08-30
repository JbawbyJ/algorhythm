export function isYahooJpConfigured() {
  return Boolean(process.env.YAHOO_JP_APP_ID && process.env.YAHOO_JP_APP_ID !== 'your_yahoo_jp_app_id')
}

/**
 * Auction search. Returns [] until YAHOO_JP_APP_ID is set.
 * Caller converts JPY → USD via fx.js after normalize.
 */
export async function searchYahooJp({ query, limit = 20 } = {}) {
  if (!isYahooJpConfigured() || !query) return []
  const params = new URLSearchParams({
    appid: process.env.YAHOO_JP_APP_ID,
    query,
    hits: String(Math.min(limit, 50)),
  })
  const url = `https://auctions.yahooapis.jp/AuctionWebService/V2/json/search?${params}`
  try {
    const res = await fetch(url)
    if (res.status === 429) {
      const err = new Error('Yahoo JP 429')
      err.status = 429
      throw err
    }
    if (!res.ok) return []
    const data = await res.json()
    return data.ResultSet?.Result?.Item || data.items || []
  } catch (err) {
    if (err.status === 429) throw err
    console.warn('yahooJp:', err.message)
    return []
  }
}
