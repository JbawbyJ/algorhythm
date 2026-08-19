import { Router } from 'express'
import { DEFAULT_PROFILE } from '../utils/tasteScorer.js'

const router = Router()

/**
 * In-memory profile store.
 * This gets replaced with Supabase when we add auth.
 * Key: sessionId (generated client-side for now)
 */
const profiles = new Map()

/**
 * GET /api/profile/:sessionId
 * Get a profile by session ID.
 */
router.get('/:sessionId', (req, res) => {
  const profile = profiles.get(req.params.sessionId)
  if (!profile) {
    return res.json({ profile: DEFAULT_PROFILE, isNew: true })
  }
  res.json({ profile, isNew: false })
})

/**
 * PUT /api/profile/:sessionId
 * Save/update a profile.
 */
router.put('/:sessionId', (req, res) => {
  const { profile } = req.body
  if (!profile) {
    return res.status(400).json({ error: 'profile is required' })
  }
  profiles.set(req.params.sessionId, { ...DEFAULT_PROFILE, ...profile })
  res.json({ ok: true, profile: profiles.get(req.params.sessionId) })
})

/**
 * POST /api/profile/:sessionId/onboard
 * Run the quick-start onboarding (L1).
 * Body: { aesthetics, budgetRange, size, mode }
 */
router.post('/:sessionId/onboard', (req, res) => {
  const { aesthetics = [], budgetRange = {}, size = 'M', mode = 'both' } = req.body

  const existing = profiles.get(req.params.sessionId) || { ...DEFAULT_PROFILE }

  const updated = {
    ...existing,
    aesthetics,
    mode,
    size,
    priceRange: {
      min: budgetRange.min ?? 0,
      max: budgetRange.max ?? 9999,
    }
  }

  profiles.set(req.params.sessionId, updated)
  res.json({ ok: true, profile: updated })
})

/**
 * DELETE /api/profile/:sessionId
 * Reset a profile to defaults.
 */
router.delete('/:sessionId', (req, res) => {
  profiles.delete(req.params.sessionId)
  res.json({ ok: true })
})

export default router
