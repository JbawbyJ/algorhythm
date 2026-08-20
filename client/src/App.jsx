import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProfileProvider } from './context/ProfileContext'
import Nav      from './components/Nav'
import Feed     from './pages/Feed'
import Onboard  from './pages/Onboard'
import Compare  from './pages/Compare'
import Profile  from './pages/Profile'
import './index.css'

export default function App() {
  return (
    <ProfileProvider>
      <BrowserRouter>
        <Nav />
        <Routes>
          <Route path="/"        element={<Navigate to="/feed" replace />} />
          <Route path="/feed"    element={<Feed />} />
          <Route path="/onboard" element={<Onboard />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </BrowserRouter>
    </ProfileProvider>
  )
}
