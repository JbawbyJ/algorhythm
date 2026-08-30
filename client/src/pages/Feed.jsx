import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { feedAPI } from '../utils/api'
import { useProfile } from '../context/ProfileContext'
import ListingCard from '../components/ListingCard'
import styles from './Feed.module.css'

const MODES = ['Both', 'Retail', 'Resale']
const FREE_PAGE_LIMIT = 5

export default function Feed() {
  const { profile, updateProfile, isNewUser, loading: profileLoading, error: profileError } = useProfile()
  const navigate = useNavigate()

  const [items, setItems]         = useState([])
  const [page, setPage]           = useState(1)
  const [totalPages, setTotal]    = useState(1)
  const [loading, setLoading]     = useState(false)
  const [mode, setMode]           = useState('Both')
  const [error, setError]         = useState(null)

  const feedDepth = profile?.feedDepth || 0
  const hitLimit  = feedDepth >= FREE_PAGE_LIMIT

  // Redirect new users to onboarding
  useEffect(() => {
    if (!profileLoading && isNewUser) navigate('/onboard')
  }, [isNewUser, profileLoading, navigate])

  // Load feed
  const loadFeed = useCallback(async (p = 1, reset = false) => {
    if (!profile || (hitLimit && p > 1)) return
    setLoading(true)
    setError(null)

    try {
      const modeMap = { Both: 'both', Retail: 'retail', Resale: 'resale' }
      const data = await feedAPI.get(
        { ...profile, mode: modeMap[mode] },
        p,
        20
      )

      setItems(prev => reset ? data.items : [...prev, ...data.items])
      setTotal(data.totalPages)
      setPage(p)

      // Increment feed depth
      if (p > 1) {
        await updateProfile({ feedDepth: feedDepth + 1 })
      }
    } catch (err) {
      console.error('Feed error:', err)
      setError(err.message || 'Could not load feed')
    } finally {
      setLoading(false)
    }
  }, [profile, mode, hitLimit, feedDepth, updateProfile])

  const tasteKey = profile
    ? JSON.stringify({
        aesthetics: profile.aesthetics,
        priceRange: profile.priceRange,
        brands: profile.brands,
        mode,
      })
    : ''

  // Reload when taste or mode changes — not when feedDepth increments
  useEffect(() => {
    if (!profileLoading && profile && !isNewUser) loadFeed(1, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasteKey, profileLoading, isNewUser])

  function handleModeChange(m) {
    setMode(m)
    setPage(1)
    setItems([])
  }

  function handleCompare(listing) {
    navigate('/compare', { state: { listing } })
  }

  const meterPct = Math.min((feedDepth / FREE_PAGE_LIMIT) * 100, 100)

  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <p className="label">Your Feed</p>
          <h1 className={styles.title}>
            Curated for <em>you</em>
          </h1>
        </div>

        {/* Mode toggle */}
        <div className={styles.toggle}>
          {MODES.map(m => (
            <button
              key={m}
              className={`${styles.toggleBtn} ${mode === m ? styles.active : ''}`}
              onClick={() => handleModeChange(m)}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Feed grid */}
      {items.length > 0 ? (
        <div className={styles.grid}>
          {items.map(item => (
            <ListingCard
              key={item.id}
              listing={item}
              onCompare={handleCompare}
            />
          ))}
        </div>
      ) : loading || profileLoading ? (
        <div className={styles.loadingState}>
          <div className="spinner" />
          <p className="muted">Pulling your feed...</p>
        </div>
      ) : (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>Nothing matches this signal.</p>
          <p className="muted">
            {error || profileError || 'Widen budget, drop a blocked brand, or recalibrate taste.'}
          </p>
          <div className={styles.emptyActions}>
            <button className="btn btn-primary" onClick={() => navigate('/profile')}>
              Edit profile
            </button>
            <button className="btn btn-ghost" onClick={() => navigate('/onboard')}>
              Recalibrate
            </button>
          </div>
        </div>
      )}

      {/* Feed meter + load more */}
      <div className={styles.meter}>
        <div className={styles.meterLeft}>
          <span className={styles.meterLabel}>
            {hitLimit
              ? 'Daily limit reached'
              : `Page ${feedDepth + 1} of ${FREE_PAGE_LIMIT} free`}
          </span>
          <div className={styles.meterBarWrap}>
            <div
              className={styles.meterFill}
              style={{ width: `${meterPct}%` }}
            />
          </div>
        </div>

        {hitLimit ? (
          <button className="btn btn-primary">
            Unlock Unlimited
          </button>
        ) : (
          page < totalPages && (
            <button
              className="btn btn-ghost"
              onClick={() => loadFeed(page + 1)}
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : 'Load More'}
            </button>
          )
        )}
      </div>

    </div>
  )
}
