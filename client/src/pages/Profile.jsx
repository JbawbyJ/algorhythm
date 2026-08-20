import { useNavigate } from 'react-router-dom'
import { useProfile } from '../context/ProfileContext'
import styles from './Profile.module.css'

const CONDITION_LABELS = {
  new_only: 'New only',
  like_new: 'Like new',
  good: 'Good and up',
  any: 'Any',
}

export default function Profile() {
  const { profile, loading, resetProfile, sessionId } = useProfile()
  const navigate = useNavigate()

  if (loading || !profile) {
    return (
      <div className={styles.page}>
        <div className="spinner" />
      </div>
    )
  }

  async function handleReset() {
    await resetProfile()
    navigate('/onboard')
  }

  const budget = profile.priceRange
    ? `$${profile.priceRange.min?.toLocaleString()} – $${profile.priceRange.max?.toLocaleString()}`
    : 'Not set'

  return (
    <div className={styles.page}>
      <p className="label">Taste Profile</p>
      <h1 className={styles.title}>Your <em>signal.</em></h1>
      <p className={styles.subtitle}>
        Built from onboarding and swipes. This is what ranks the feed.
      </p>

      <section className={styles.card}>
        <p className={styles.sectionLabel}>Aesthetics</p>
        <div className={styles.chips}>
          {profile.aesthetics?.length
            ? profile.aesthetics.map(a => (
                <span key={a} className={styles.chip}>{a}</span>
              ))
            : <span className="muted">Not calibrated yet</span>}
        </div>
      </section>

      <section className={styles.row}>
        <div className={styles.card}>
          <p className={styles.sectionLabel}>Budget</p>
          <p className={styles.value}>{budget}</p>
        </div>
        <div className={styles.card}>
          <p className={styles.sectionLabel}>Mode</p>
          <p className={styles.value}>{profile.mode || 'both'}</p>
        </div>
        <div className={styles.card}>
          <p className={styles.sectionLabel}>Condition</p>
          <p className={styles.value}>
            {CONDITION_LABELS[profile.conditionTolerance] || profile.conditionTolerance}
          </p>
        </div>
      </section>

      <section className={styles.card}>
        <p className={styles.sectionLabel}>Liked brands</p>
        <div className={styles.chips}>
          {profile.brands?.liked?.length
            ? profile.brands.liked.map(b => (
                <span key={b} className={styles.chip}>{b}</span>
              ))
            : <span className="muted">Like items in calibration or the feed to seed this</span>}
        </div>
      </section>

      <p className={styles.session}>Session {sessionId}</p>

      <div className={styles.actions}>
        <button className="btn btn-primary" onClick={() => navigate('/onboard')}>
          Recalibrate →
        </button>
        <button className="btn btn-ghost" onClick={handleReset}>
          Reset profile
        </button>
      </div>
    </div>
  )
}
