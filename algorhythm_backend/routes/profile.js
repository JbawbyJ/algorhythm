import { Router } from 'express'
import { DEFAULT_PROFILE } from '../utils/tasteScorer.js'
import { deleteProfile, getProfile, saveProfile } from '../services/profileStore.js'

const router = Router()

/**
 * File-backed profile store (JSON). Supabase can replace this later.
 * Key: sessionId (generated client-side for now)
 */

router.get('/:sessionId', (req, res) => {
  const profile = getProfile(req.params.sessionId)
  if (!profile) {
    return res.json({ profile: { ...DEFAULT_PROFILE }, isNew: true })
  }
  res.json({ profile, isNew: false })
})

router.put('/:sessionId', (req, res) => {
  const { profile } = req.body
  if (!profile) {
    return res.status(400).json({ error: 'profile is required' })
  }
  const saved = saveProfile(req.params.sessionId, { ...DEFAULT_PROFILE, ...profile })
  res.json({ ok: true, profile: saved })
})

router.post('/:sessionId/onboard', (req, res) => {
  const { aesthetics = [], budgetRange = {}, size = 'M', mode = 'both' } = req.body
  const existing = getProfile(req.params.sessionId) || { ...DEFAULT_PROFILE }
  const updated = saveProfile(req.params.sessionId, {
    ...existing,
    aesthetics: [...new Set([...(existing.aesthetics || []), ...aesthetics])],
    mode,
    size,
    priceRange: {
      min: budgetRange.min ?? existing.priceRange?.min ?? 0,
      max: budgetRange.max ?? existing.priceRange?.max ?? 9999,
    },
  })
  res.json({ ok: true, profile: updated })
})

router.delete('/:sessionId', (req, res) => {
  deleteProfile(req.params.sessionId)
  res.json({ ok: true })
})

export default router
