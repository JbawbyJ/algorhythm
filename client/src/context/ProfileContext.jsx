import { createContext, useContext, useState, useEffect } from 'react'
import { profileAPI } from '../utils/api'

const ProfileContext = createContext(null)

// Generate or retrieve a session ID
function getSessionId() {
  let id = localStorage.getItem('alg_session')
  if (!id) {
    id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    localStorage.setItem('alg_session', id)
  }
  return id
}

export function ProfileProvider({ children }) {
  const [profile, setProfile]       = useState(null)
  const [sessionId]                 = useState(getSessionId)
  const [loading, setLoading]       = useState(true)
  const [isNewUser, setIsNewUser]   = useState(false)
  const [error, setError]           = useState(null)

  // Load profile on mount
  useEffect(() => {
    profileAPI.get(sessionId)
      .then(({ profile, isNew }) => {
        setProfile(profile)
        setIsNewUser(isNew)
        setError(null)
      })
      .catch(err => {
        console.error(err)
        setError('Cannot reach the API. Start the backend on port 3001.')
      })
      .finally(() => setLoading(false))
  }, [sessionId])

  // Save profile whenever it changes
  async function updateProfile(updates) {
    const updated = { ...profile, ...updates }
    setProfile(updated)
    await profileAPI.save(sessionId, updated)
    return updated
  }

  async function onboard(data) {
    const { profile: updated } = await profileAPI.onboard(sessionId, data)
    setProfile(updated)
    setIsNewUser(false)
    return updated
  }

  async function resetProfile() {
    await profileAPI.reset(sessionId)
    const { profile: fresh } = await profileAPI.get(sessionId)
    setProfile(fresh)
    setIsNewUser(true)
  }

  return (
    <ProfileContext.Provider value={{
      profile,
      sessionId,
      loading,
      isNewUser,
      error,
      updateProfile,
      onboard,
      resetProfile,
    }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider')
  return ctx
}
