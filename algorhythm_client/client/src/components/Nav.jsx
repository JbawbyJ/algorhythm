import { Link, useLocation } from 'react-router-dom'
import { useProfile } from '../context/ProfileContext'
import styles from './Nav.module.css'

export default function Nav() {
  const { pathname } = useLocation()
  const { profile }  = useProfile()

  const links = [
    { to: '/feed',    label: 'Feed'     },
    { to: '/compare', label: 'Compare'  },
    { to: '/profile', label: 'Profile'  },
  ]

  return (
    <nav className={styles.nav}>
      <Link to="/" className={styles.logo}>
        ALGORH<span>Y</span>THM
      </Link>

      <ul className={styles.links}>
        {links.map(l => (
          <li key={l.to}>
            <Link
              to={l.to}
              className={`${styles.link} ${pathname.startsWith(l.to) ? styles.active : ''}`}
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>

      <div className={styles.right}>
        {profile?.aesthetics?.length > 0 && (
          <span className={styles.calibrated}>● Calibrated</span>
        )}
        <Link to="/onboard" className={styles.cta}>
          {profile?.aesthetics?.length > 0 ? 'Recalibrate' : 'Begin'}
        </Link>
      </div>
    </nav>
  )
}
