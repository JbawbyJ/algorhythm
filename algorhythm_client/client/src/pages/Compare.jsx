import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { compareAPI } from '../utils/api'
import styles from './Compare.module.css'

const DEAL_LABELS = {
  great:   { label: 'Great Deal',  color: '#4a8a4a' },
  good:    { label: 'Good Price',  color: '#6a8a4a' },
  fair:    { label: 'Fair Price',  color: '#8a7a3a' },
  high:    { label: 'Above Market',color: '#8a3a3a' },
  unknown: { label: 'Unknown',     color: '#444'    },
}

const TIER_LABELS = {
  exactMatch: 'Exact Match',
  colorMatch: 'Same Model, Different Color',
  modelMatch: 'Same Model',
  brandMatch: 'Same Brand',
}

export default function Compare() {
  const location = useLocation()
  const [query, setQuery]     = useState('')
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  // If navigated from feed with a listing
  useEffect(() => {
    if (location.state?.listing) {
      runCompare(null, location.state.listing)
    }
  }, [])

  async function runCompare(e, listing = null) {
    e?.preventDefault()
    if (!query && !listing) return
    setLoading(true)
    setError(null)

    try {
      const data = listing
        ? await compareAPI.byListing(listing)
        : await compareAPI.byQuery(query)
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const deal = result?.stats ? DEAL_LABELS[result.stats.dealScore] : null

  return (
    <div className={styles.page}>

      <div className={styles.header}>
        <p className="label">Price Intelligence</p>
        <h1 className={styles.title}>Compare <em>prices.</em></h1>
      </div>

      {/* Search */}
      <form onSubmit={runCompare} className={styles.searchRow}>
        <input
          className={styles.input}
          placeholder="Search a piece — e.g. Nemen jacket army green"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || !query}
        >
          {loading ? <span className="spinner" /> : 'Compare →'}
        </button>
      </form>

      {error && <p className={styles.error}>{error}</p>}

      {result && (
        <div className={styles.results}>

          {/* Source item */}
          <div className={styles.sourceCard}>
            <div className={styles.sourceLeft}>
              <p className="label">Source Listing</p>
              <div className={styles.sourceBrand}>{result.source.brand}</div>
              <div className={styles.sourceName}>{result.source.name}</div>
              <div className={styles.sourceMeta}>
                {result.source.source_label} · {result.source.condition}
              </div>
            </div>
            <div className={styles.sourceRight}>
              <div className={styles.sourcePrice}>
                ${result.source.price?.toLocaleString()}
              </div>
              {deal && (
                <div
                  className={styles.dealBadge}
                  style={{ borderColor: deal.color, color: deal.color }}
                >
                  {deal.label}
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          {result.stats && (
            <div className={styles.statsRow}>
              {[
                { label: 'Market Low',  val: `$${result.stats.min?.toLocaleString()}` },
                { label: 'Average',     val: `$${result.stats.avg?.toLocaleString()}` },
                { label: 'Median',      val: `$${result.stats.median?.toLocaleString()}` },
                { label: 'Market High', val: `$${result.stats.max?.toLocaleString()}` },
                { label: 'Listings',    val: result.stats.count },
              ].map(s => (
                <div key={s.label} className={styles.statCell}>
                  <span className={styles.statVal}>{s.val}</span>
                  <span className={styles.statLabel}>{s.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Match groups */}
          {Object.entries(result.grouped).map(([tier, items]) => {
            if (!items?.length) return null
            return (
              <div key={tier} className={styles.tierGroup}>
                <p className={styles.tierLabel}>{TIER_LABELS[tier]}</p>
                <div className={styles.matchList}>
                  {items.map(item => (
                    <div key={item.id} className={styles.matchRow}>
                      <div className={styles.matchInfo}>
                        <div className={styles.matchBrand}>{item.brand}</div>
                        <div className={styles.matchName}>{item.name}</div>
                        <div className={styles.matchMeta}>
                          {item.source_label} · {item.condition} · {item.similarity}% similar
                        </div>
                      </div>
                      <div className={styles.matchRight}>
                        <div className={styles.matchPrice}>
                          ${item.price?.toLocaleString()}
                        </div>
                        <div
                          className={styles.matchDelta}
                          style={{ color: item.priceDelta <= 0 ? '#4a8a4a' : '#8a4040' }}
                        >
                          {item.priceDelta > 0 ? '+' : ''}{item.priceDelta > 0 ? '$' : '-$'}{Math.abs(item.priceDelta).toLocaleString()}
                          {' '}({item.priceDeltaPct > 0 ? '+' : ''}{item.priceDeltaPct}%)
                        </div>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.viewLink}
                        >
                          View →
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

        </div>
      )}

    </div>
  )
}
