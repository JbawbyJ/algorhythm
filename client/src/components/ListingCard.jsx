import { useState } from 'react'
import styles from './ListingCard.module.css'

const DEAL_COLORS = {
  great:   '#4a8a4a',
  good:    '#6a8a4a',
  fair:    '#8a7a3a',
  high:    '#8a3a3a',
  unknown: '#444',
}

const CONDITION_LABELS = {
  new:      'New',
  like_new: 'Like New',
  good:     'Good',
  worn:     'Worn',
  unknown:  'Unknown',
}

export default function ListingCard({ listing, onSave, onCompare }) {
  const [saved, setSaved] = useState(false)
  const [imgError, setImgError] = useState(false)

  function handleSave(e) {
    e.stopPropagation()
    setSaved(s => !s)
    onSave?.(listing)
  }

  function handleCompare(e) {
    e.stopPropagation()
    onCompare?.(listing)
  }

  const matchColor = listing.matchScore >= 90 ? 'var(--gold)'
    : listing.matchScore >= 70 ? 'var(--ash)'
    : 'var(--ghost)'

  return (
    <div className={styles.card}>

      {/* Image */}
      <div className={styles.imageWrap}>
        {listing.images?.[0] && !imgError ? (
          <img
            src={listing.images[0]}
            alt={listing.name}
            className={styles.image}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className={styles.imagePlaceholder}>
            <span>◈</span>
          </div>
        )}

        {/* Aesthetic tags */}
        <div className={styles.aestheticTags}>
          {listing.aesthetics?.slice(0, 2).map(a => (
            <span key={a} className={styles.aestheticTag}>{a}</span>
          ))}
        </div>

        {/* Save button */}
        <button
          className={`${styles.saveBtn} ${saved ? styles.saved : ''}`}
          onClick={handleSave}
          title="Save"
        >
          {saved ? '♥' : '♡'}
        </button>

        {/* Match bar */}
        {listing.matchScore !== undefined && (
          <div className={styles.matchBar}>
            <div
              className={styles.matchFill}
              style={{ width: `${listing.matchScore}%` }}
            />
          </div>
        )}
      </div>

      {/* Body */}
      <div className={styles.body}>
        <div className={styles.brand}>{listing.brand}</div>
        <div className={styles.name}>{listing.name}</div>

        <div className={styles.footer}>
          <div className={styles.priceBlock}>
            <span className={styles.price}>
              ${listing.price?.toLocaleString()}
            </span>
            <span className={styles.priceMeta}>
              {listing.source_label} · {CONDITION_LABELS[listing.condition] || 'Unknown'}
            </span>
          </div>

          <div className={styles.rightBlock}>
            {listing.matchScore !== undefined && (
              <span className={styles.matchPct} style={{ color: matchColor }}>
                {listing.matchScore}%
              </span>
            )}
            <button className={styles.compareBtn} onClick={handleCompare}>
              ⇄
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
