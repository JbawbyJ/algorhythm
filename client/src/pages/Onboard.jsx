import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../context/ProfileContext'
import { ebayAPI, feedAPI } from '../utils/api'
import styles from './Onboard.module.css'

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

const MODES = ['retail', 'resale', 'both']

// Pool of calibration queries — real listings pulled from these
const CALIBRATION_QUERIES = [
  { query: 'Acronym jacket',            aesthetics: ['Gorpcore', 'Technical']       },
  { query: 'Rick Owens jacket',         aesthetics: ['Dark Luxury']                 },
  { query: "Arc'teryx Veilance coat",   aesthetics: ['Gorpcore', 'Quiet Luxury']    },
  { query: 'Julius pants',              aesthetics: ['Dark Luxury', 'Avant-garde']  },
  { query: 'Yohji Yamamoto jacket',     aesthetics: ['Avant-garde', 'Archive']      },
  { query: 'Engineered Garments shirt', aesthetics: ['Workwear']                    },
  { query: 'Carhartt WIP jacket',       aesthetics: ['Workwear', 'Gorpcore']        },
  { query: 'Lemaire coat',              aesthetics: ['Quiet Luxury']                },
  { query: 'Nike ACG jacket',           aesthetics: ['Gorpcore']                    },
  { query: 'Stone Island jacket',       aesthetics: ['Gorpcore', 'Technical']       },
  { query: 'Boris Bidjan Saberi',       aesthetics: ['Dark Luxury', 'Technical']    },
  { query: 'Needles track jacket',      aesthetics: ['Archive', 'Workwear']         },
]

// Fisher-Yates shuffle
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function Onboard() {
  const { onboard, profile, updateProfile } = useProfile()
  const navigate    = useNavigate()

  const [step, setStep]             = useState(1)
  const [aesthetics, setAesthetics] = useState([])
  const [budget, setBudget]         = useState(null)
  const [mode, setMode]             = useState('both')
  const [swipeItems, setSwipeItems] = useState([])
  const [swipeIndex, setSwipeIndex] = useState(0)
  const [loadingSwipes, setLoading] = useState(false)
  const [imgErrors, setImgErrors]   = useState({})

  function toggleAesthetic(a) {
    setAesthetics(prev =>
      prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]
    )
  }

  async function submitL1() {
    if (!aesthetics.length || !budget) return
    setStep(2)
    setLoading(true)

    try {
      // Shuffle query pool — unique order every session
      const selected = shuffle(CALIBRATION_QUERIES).slice(0, 8)

      // Fetch listings in parallel
      const results = await Promise.allSettled(
        selected.map(q => ebayAPI.search(q.query, { limit: 5 }))
      )

      const items = []
      results.forEach((res, i) => {
        if (res.status !== 'fulfilled') return
        const pool = (res.value.items || []).filter(it => it.images?.length > 0)
        if (!pool.length) return
        // Pick a random item with an image from the result pool
        const picked = pool[Math.floor(Math.random() * pool.length)]
        items.push({ ...picked, aesthetics: selected[i].aesthetics })
      })

      setSwipeItems(shuffle(items))
    } catch (err) {
      console.error('Calibration fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSwipe(action) {
    const listing = swipeItems[swipeIndex]
    if (listing && profile) {
      try {
        const { profile: updated } = await feedAPI.swipe(profile, listing, action)
        await updateProfile(updated)
      } catch (err) {
        console.error('Swipe error:', err)
      }
    }

    if (swipeIndex + 1 >= swipeItems.length) {
      await finalize()
    } else {
      setSwipeIndex(i => i + 1)
    }
  }

  async function finalize() {
    await onboard({ aesthetics, budgetRange: budget, mode })
    navigate('/feed')
  }

  const current      = swipeItems[swipeIndex]
  const swipeProgress = swipeItems.length
    ? Math.round((swipeIndex / swipeItems.length) * 100)
    : 0
  const currentImg   = current?.images?.[0]
  const imgFailed    = imgErrors[swipeIndex]

  return (
    <div className={styles.page}>

      {/* ── STEP 1 ── */}
      {step === 1 && (
        <div className={`${styles.step} fade-up`}>
          <p className="label">Step 1 of 2</p>
          <h1 className={styles.title}>Set your<br /><em>aesthetic.</em></h1>
          <p className={styles.subtitle}>
            Pick everything that resonates. You can refine at any time.
          </p>

          <div className={styles.section}>
            <p className={styles.sectionLabel}>Your Aesthetic</p>
            <div className={styles.chips}>
              {AESTHETICS.map(a => (
                <button
                  key={a}
                  className={`${styles.chip} ${aesthetics.includes(a) ? styles.chipOn : ''}`}
                  onClick={() => toggleAesthetic(a)}
                >{a}</button>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <p className={styles.sectionLabel}>Budget Sweet Spot</p>
            <div className={styles.budgetGrid}>
              {BUDGET_RANGES.map(b => (
                <button
                  key={b.label}
                  className={`${styles.budgetBtn} ${budget?.label === b.label ? styles.budgetOn : ''}`}
                  onClick={() => setBudget(b)}
                >{b.label}</button>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <p className={styles.sectionLabel}>Feed Mode</p>
            <div className={styles.modeRow}>
              {MODES.map(m => (
                <button
                  key={m}
                  className={`${styles.modeBtn} ${mode === m ? styles.modeOn : ''}`}
                  onClick={() => setMode(m)}
                >{m.charAt(0).toUpperCase() + m.slice(1)}</button>
              ))}
            </div>
          </div>

          <button
            className={`btn btn-primary ${styles.nextBtn}`}
            onClick={submitL1}
            disabled={!aesthetics.length || !budget}
          >
            Next — Calibrate Taste →
          </button>
        </div>
      )}

      {/* ── STEP 2 ── */}
      {step === 2 && (
        <div className={`${styles.step} fade-up`}>
          <p className="label">Step 2 of 2 — Taste Calibration</p>
          <h1 className={styles.title}>Like it or<br /><em>leave it.</em></h1>
          <p className={styles.subtitle}>
            Real listings, pulled live. Your pattern trains the algorithm.
          </p>

          {/* Loading */}
          {loadingSwipes && (
            <div className={styles.loadingSwipes}>
              <div className="spinner" />
              <p className="muted">Pulling live listings...</p>
            </div>
          )}

          {/* Swipe card */}
          {!loadingSwipes && current && (
            <>
              <div className={styles.swipeProgress}>
                <div className={styles.swipeProgressFill} style={{ width: `${swipeProgress}%` }} />
              </div>
              <p className={styles.swipeCount}>{swipeIndex + 1} / {swipeItems.length}</p>

              <div className={styles.swipeCard}>
                <div className={styles.swipeImg}>
                  {currentImg && !imgFailed ? (
                    <img
                      src={currentImg}
                      alt={current.name}
                      className={styles.swipeImgReal}
                      onError={() => setImgErrors(p => ({ ...p, [swipeIndex]: true }))}
                    />
                  ) : (
                    <span className={styles.swipeImgFallback}>◈</span>
                  )}
                </div>

                <div className={styles.swipeInfo}>
                  <div className={styles.swipeBrand}>{current.brand}</div>
                  <div className={styles.swipeName}>{current.name}</div>
                  <div className={styles.swipeTags}>
                    {current.aesthetics?.map(a => (
                      <span key={a} className={styles.swipeTag}>{a}</span>
                    ))}
                  </div>
                  <div className={styles.swipePriceMeta}>
                    <span className={styles.swipePrice}>${current.price?.toLocaleString()}</span>
                    <span className={styles.swipeSource}>
                      {current.source_label} · {current.condition}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.swipeActions}>
                <button className={`${styles.swipeBtn} ${styles.dislike}`} onClick={() => handleSwipe('dislike')}>✕ Pass</button>
                <button className={`${styles.swipeBtn} ${styles.save}`}   onClick={() => handleSwipe('save')}>♥ Save</button>
                <button className={`${styles.swipeBtn} ${styles.like}`}   onClick={() => handleSwipe('like')}>✓ Like</button>
              </div>

              <button className={styles.skipLink} onClick={finalize}>
                Skip calibration →
              </button>
            </>
          )}

          {/* Fallback — no listings loaded */}
          {!loadingSwipes && !current && (
            <div className={styles.loadingSwipes}>
              <p className="muted" style={{ marginBottom: 16 }}>
                Couldn't load live listings. Head to your feed and calibrate as you browse.
              </p>
              <button className="btn btn-primary" onClick={finalize}>Go to Feed →</button>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
