import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../context/ProfileContext'
import styles from './Onboard.module.css'

const AESTHETICS = [
  'Gorpcore', 'Dark Luxury', 'Technical', 'Avant-garde',
  'Quiet Luxury', 'Archive', 'Workwear', 'Brutalist'
]

const BUDGET_RANGES = [
  { label: '$0 – 200',   min: 0,    max: 200  },
  { label: '$200 – 500', min: 200,  max: 500  },
  { label: '$500 – 1.5k',min: 500,  max: 1500 },
  { label: '$1.5k+',     min: 1500, max: 9999 },
]

const MODES = ['retail', 'resale', 'both']

// Mock swipe items — replace with real listings later
const SWIPE_ITEMS = [
  { id: 1, brand: 'Acronym',          name: 'J1A-GT Shell Jacket',     aesthetics: ['Gorpcore','Technical'],      price: 2200, emoji: '◈' },
  { id: 2, brand: 'Rick Owens',       name: 'DRKSHDW Pod Boots',       aesthetics: ['Dark Luxury'],               price: 890,  emoji: '◉' },
  { id: 3, brand: "Arc'teryx Veilance",name: 'Mionn IS Coat',          aesthetics: ['Gorpcore','Quiet Luxury'],   price: 1200, emoji: '◍' },
  { id: 4, brand: 'Julius',           name: 'Layer Cargo Pant SS24',   aesthetics: ['Dark Luxury','Avant-garde'], price: 480,  emoji: '◎' },
  { id: 5, brand: 'Yohji Yamamoto',   name: 'S/S 2019 Blazer',        aesthetics: ['Avant-garde','Archive'],     price: 620,  emoji: '◇' },
  { id: 6, brand: 'Engineered Garments',name: 'Dayton Shirt Jacket',   aesthetics: ['Workwear'],                  price: 280,  emoji: '▣' },
  { id: 7, brand: 'Carhartt WIP',     name: 'OG Active Jacket',        aesthetics: ['Workwear','Gorpcore'],       price: 180,  emoji: '▤' },
  { id: 8, brand: 'Lemaire',          name: 'Boxy Suit Jacket',        aesthetics: ['Quiet Luxury'],              price: 960,  emoji: '▥' },
]

export default function Onboard() {
  const { onboard } = useProfile()
  const navigate    = useNavigate()

  const [step, setStep]           = useState(1)  // 1 = L1, 2 = L2 swipe
  const [aesthetics, setAesthetics] = useState([])
  const [budget, setBudget]       = useState(null)
  const [mode, setMode]           = useState('both')
  const [swipeIndex, setSwipeIndex] = useState(0)
  const [swipes, setSwipes]       = useState([])

  function toggleAesthetic(a) {
    setAesthetics(prev =>
      prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]
    )
  }

  async function submitL1() {
    if (!aesthetics.length || !budget) return
    setStep(2)
  }

  async function handleSwipe(action) {
    const item = SWIPE_ITEMS[swipeIndex]
    setSwipes(prev => [...prev, { item, action }])

    if (swipeIndex + 1 >= SWIPE_ITEMS.length) {
      // Done — submit everything
      await finalize()
    } else {
      setSwipeIndex(i => i + 1)
    }
  }

  async function finalize() {
    await onboard({
      aesthetics,
      budgetRange: budget,
      mode,
    })
    navigate('/feed')
  }

  const currentSwipe = SWIPE_ITEMS[swipeIndex]
  const swipeProgress = Math.round((swipeIndex / SWIPE_ITEMS.length) * 100)

  return (
    <div className={styles.page}>

      {step === 1 && (
        <div className={`${styles.step} fade-up`}>
          <p className="label">Step 1 of 2</p>
          <h1 className={styles.title}>Set your<br /><em>aesthetic.</em></h1>
          <p className={styles.subtitle}>Pick everything that resonates. You can always refine later.</p>

          {/* Aesthetics */}
          <div className={styles.section}>
            <p className={styles.sectionLabel}>Your Aesthetic</p>
            <div className={styles.chips}>
              {AESTHETICS.map(a => (
                <button
                  key={a}
                  className={`${styles.chip} ${aesthetics.includes(a) ? styles.chipOn : ''}`}
                  onClick={() => toggleAesthetic(a)}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Budget */}
          <div className={styles.section}>
            <p className={styles.sectionLabel}>Budget Sweet Spot</p>
            <div className={styles.budgetGrid}>
              {BUDGET_RANGES.map(b => (
                <button
                  key={b.label}
                  className={`${styles.budgetBtn} ${budget?.label === b.label ? styles.budgetOn : ''}`}
                  onClick={() => setBudget(b)}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mode */}
          <div className={styles.section}>
            <p className={styles.sectionLabel}>Feed Mode</p>
            <div className={styles.modeRow}>
              {MODES.map(m => (
                <button
                  key={m}
                  className={`${styles.modeBtn} ${mode === m ? styles.modeOn : ''}`}
                  onClick={() => setMode(m)}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
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

      {step === 2 && currentSwipe && (
        <div className={`${styles.step} fade-up`}>
          <p className="label">Step 2 of 2 — Taste Calibration</p>
          <h1 className={styles.title}>Like it or<br /><em>leave it.</em></h1>
          <p className={styles.subtitle}>
            Swipe through {SWIPE_ITEMS.length} pieces. Your pattern trains the algorithm.
          </p>

          {/* Progress */}
          <div className={styles.swipeProgress}>
            <div className={styles.swipeProgressFill} style={{ width: `${swipeProgress}%` }} />
          </div>

          {/* Swipe card */}
          <div className={styles.swipeCard}>
            <div className={styles.swipeImg}>
              <span>{currentSwipe.emoji}</span>
            </div>
            <div className={styles.swipeInfo}>
              <div className={styles.swipeBrand}>{currentSwipe.brand}</div>
              <div className={styles.swipeName}>{currentSwipe.name}</div>
              <div className={styles.swipeTags}>
                {currentSwipe.aesthetics.map(a => (
                  <span key={a} className={styles.swipeTag}>{a}</span>
                ))}
              </div>
              <div className={styles.swipePrice}>
                ${currentSwipe.price.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Swipe actions */}
          <div className={styles.swipeActions}>
            <button
              className={`${styles.swipeBtn} ${styles.dislike}`}
              onClick={() => handleSwipe('dislike')}
            >
              ✕ Pass
            </button>
            <button
              className={`${styles.swipeBtn} ${styles.save}`}
              onClick={() => handleSwipe('save')}
            >
              ♥ Save
            </button>
            <button
              className={`${styles.swipeBtn} ${styles.like}`}
              onClick={() => handleSwipe('like')}
            >
              ✓ Like
            </button>
          </div>

          <button
            className={`${styles.skipLink}`}
            onClick={finalize}
          >
            Skip calibration →
          </button>
        </div>
      )}

    </div>
  )
}
