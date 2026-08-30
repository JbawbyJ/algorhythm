import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../context/ProfileContext'
import styles from './Profile.module.css'

const AESTHETICS = [
  'Gorpcore', 'Dark Luxury', 'Technical', 'Avant-garde',
  'Quiet Luxury', 'Archive', 'Workwear', 'Brutalist'
]

const BUDGET_RANGES = [
  { label: '$0 – 200',    min: 0,    max: 200  },
  { label: '$200 – 500',  min: 200,  max: 500  },
  { label: '$500 – 1.5k', min: 500,  max: 1500 },
  { label: '$1.5k+',      min: 1500, max: 9999 },
]

const SIZES = ['XS', 'S', 'M', 'L', 'XL']
const MODES = ['retail', 'resale', 'both']

function budgetFromRange(range) {
  if (!range) return BUDGET_RANGES[3]
  return BUDGET_RANGES.find(b => b.min === range.min && b.max === range.max) || {
    label: `$${range.min} – $${range.max}`,
    min: range.min,
    max: range.max,
  }
}

export default function Profile() {
  const { profile, loading, resetProfile, updateProfile, sessionId } = useProfile()
  const navigate = useNavigate()
  const [aesthetics, setAesthetics] = useState([])
  const [budget, setBudget] = useState(BUDGET_RANGES[1])
  const [size, setSize] = useState('M')
  const [mode, setMode] = useState('both')
  const [blocked, setBlocked] = useState([])
  const [blockInput, setBlockInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState(null)

  useEffect(() => {
    if (!profile) return
    setAesthetics(profile.aesthetics || [])
    setBudget(budgetFromRange(profile.priceRange))
    setSize(profile.size || 'M')
    setMode(profile.mode || 'both')
    setBlocked(profile.brands?.blocked || [])
  }, [profile])

  if (loading || !profile) {
    return (
      <div className={styles.page}>
        <div className="spinner" />
      </div>
    )
  }

  function toggleAesthetic(a) {
    setAesthetics(prev =>
      prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]
    )
  }

  function addBlocked(e) {
    e.preventDefault()
    const brand = blockInput.trim()
    if (!brand) return
    setBlocked(prev => prev.some(b => b.toLowerCase() === brand.toLowerCase())
      ? prev
      : [...prev, brand])
    setBlockInput('')
  }

  async function handleSave() {
    setSaving(true)
    setSavedMsg(null)
    try {
      await updateProfile({
        aesthetics,
        size,
        mode,
        priceRange: { min: budget.min, max: budget.max },
        brands: {
          liked: profile.brands?.liked || [],
          blocked,
        },
      })
      setSavedMsg('Saved')
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    await resetProfile()
    navigate('/onboard')
  }

  return (
    <div className={styles.page}>
      <p className="label">Taste Profile</p>
      <h1 className={styles.title}>Your <em>signal.</em></h1>
      <p className={styles.subtitle}>
        Edit chips, budget, size, and blocklist. This is what ranks the feed.
      </p>

      <section className={styles.card}>
        <p className={styles.sectionLabel}>Aesthetics</p>
        <div className={styles.chips}>
          {AESTHETICS.map(a => (
            <button
              key={a}
              type="button"
              className={`${styles.chipBtn} ${aesthetics.includes(a) ? styles.chipOn : ''}`}
              onClick={() => toggleAesthetic(a)}
            >{a}</button>
          ))}
        </div>
      </section>

      <section className={styles.card}>
        <p className={styles.sectionLabel}>Budget</p>
        <div className={styles.budgetGrid}>
          {BUDGET_RANGES.map(b => (
            <button
              key={b.label}
              type="button"
              className={`${styles.budgetBtn} ${budget.min === b.min && budget.max === b.max ? styles.budgetOn : ''}`}
              onClick={() => setBudget(b)}
            >{b.label}</button>
          ))}
        </div>
      </section>

      <section className={styles.row}>
        <div className={styles.card}>
          <p className={styles.sectionLabel}>Size</p>
          <div className={styles.chips}>
            {SIZES.map(s => (
              <button
                key={s}
                type="button"
                className={`${styles.chipBtn} ${size === s ? styles.chipOn : ''}`}
                onClick={() => setSize(s)}
              >{s}</button>
            ))}
          </div>
        </div>
        <div className={styles.card}>
          <p className={styles.sectionLabel}>Mode</p>
          <div className={styles.chips}>
            {MODES.map(m => (
              <button
                key={m}
                type="button"
                className={`${styles.chipBtn} ${mode === m ? styles.chipOn : ''}`}
                onClick={() => setMode(m)}
              >{m}</button>
            ))}
          </div>
        </div>
        <div className={styles.card}>
          <p className={styles.sectionLabel}>Liked brands</p>
          <div className={styles.chips}>
            {profile.brands?.liked?.length
              ? profile.brands.liked.map(b => (
                  <span key={b} className={styles.chip}>{b}</span>
                ))
              : <span className="muted">Like items in the feed to seed this</span>}
          </div>
        </div>
      </section>

      <section className={styles.card}>
        <p className={styles.sectionLabel}>Blocklist</p>
        <form className={styles.blockRow} onSubmit={addBlocked}>
          <input
            className={styles.editorInput}
            value={blockInput}
            onChange={e => setBlockInput(e.target.value)}
            placeholder="Brand to hide"
          />
          <button type="submit" className="btn btn-ghost">Block</button>
        </form>
        <div className={styles.chips}>
          {blocked.length
            ? blocked.map(b => (
                <button
                  key={b}
                  type="button"
                  className={`${styles.chipBtn} ${styles.chipOn}`}
                  onClick={() => setBlocked(prev => prev.filter(x => x !== b))}
                >{b} ×</button>
              ))
            : <span className="muted">No blocked brands</span>}
        </div>
      </section>

      <p className={styles.session}>Session {sessionId}</p>

      <div className={styles.actions}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save profile'}
        </button>
        <button className="btn btn-ghost" onClick={() => navigate('/onboard')}>
          Recalibrate →
        </button>
        <button className="btn btn-ghost" onClick={handleReset}>
          Reset profile
        </button>
      </div>
      {savedMsg && <p className={styles.session}>{savedMsg}</p>}
    </div>
  )
}
