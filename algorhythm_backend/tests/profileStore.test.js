import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { deleteProfile, getProfile, saveProfile } from '../services/profileStore.js'

let tmp

afterEach(() => {
  if (tmp) {
    rmSync(tmp, { recursive: true, force: true })
    tmp = null
  }
  delete process.env.ALGORHYTHM_PROFILE_PATH
})

test('profiles persist to disk and reload from the same file', () => {
  tmp = mkdtempSync(join(tmpdir(), 'alg-profiles-'))
  process.env.ALGORHYTHM_PROFILE_PATH = join(tmp, 'profiles.json')

  const saved = saveProfile('sess_1', {
    aesthetics: ['Gorpcore'],
    size: 'L',
    brands: { liked: ['Acronym'], blocked: ['Supreme'] },
    priceRange: { min: 200, max: 500 },
  })
  assert.equal(saved.size, 'L')
  assert.deepEqual(saved.brands.blocked, ['Supreme'])

  const loaded = getProfile('sess_1')
  assert.equal(loaded.size, 'L')
  assert.ok(loaded.aesthetics.includes('Gorpcore'))
  assert.deepEqual(loaded.brands.liked, ['Acronym'])
  assert.equal(getProfile('missing'), null)
  assert.equal(deleteProfile('sess_1'), true)
  assert.equal(getProfile('sess_1'), null)
})
