import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DEFAULT_PROFILE } from '../utils/tasteScorer.js'

const DEFAULT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'data')

function storePath() {
  return process.env.ALGORHYTHM_PROFILE_PATH
    || join(DEFAULT_DIR, 'profiles.json')
}

function safeSessionId(id) {
  return String(id || '').replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 80)
}

function readAll() {
  const file = storePath()
  try {
    const raw = JSON.parse(readFileSync(file, 'utf8'))
    return raw && typeof raw === 'object' ? raw : {}
  } catch {
    return {}
  }
}

function writeAll(data) {
  const file = storePath()
  mkdirSync(dirname(file), { recursive: true })
  const tmp = `${file}.tmp`
  writeFileSync(tmp, JSON.stringify(data, null, 2))
  try {
    if (existsSync(file)) unlinkSync(file)
    renameSync(tmp, file)
  } catch {
    writeFileSync(file, JSON.stringify(data, null, 2))
    if (existsSync(tmp)) unlinkSync(tmp)
  }
}

export function getProfile(sessionId) {
  const key = safeSessionId(sessionId)
  if (!key) return null
  const row = readAll()[key]
  if (!row) return null
  return {
    ...DEFAULT_PROFILE,
    ...row,
    brands: {
      liked: row.brands?.liked || [],
      blocked: row.brands?.blocked || [],
    },
    priceRange: {
      min: row.priceRange?.min ?? DEFAULT_PROFILE.priceRange.min,
      max: row.priceRange?.max ?? DEFAULT_PROFILE.priceRange.max,
    },
    vector: { ...DEFAULT_PROFILE.vector, ...(row.vector || {}) },
  }
}

export function saveProfile(sessionId, profile) {
  const key = safeSessionId(sessionId)
  if (!key) throw new Error('sessionId is required')
  const all = readAll()
  const merged = {
    ...DEFAULT_PROFILE,
    ...profile,
    brands: {
      liked: [...new Set(profile?.brands?.liked || [])],
      blocked: [...new Set(profile?.brands?.blocked || [])],
    },
    updatedAt: new Date().toISOString(),
  }
  all[key] = merged
  writeAll(all)
  return merged
}

export function deleteProfile(sessionId) {
  const key = safeSessionId(sessionId)
  const all = readAll()
  if (!(key in all)) return false
  delete all[key]
  writeAll(all)
  return true
}
