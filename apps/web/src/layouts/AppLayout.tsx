import { NavLink, Outlet, useNavigate } from 'react-router'
import { useAuth } from '../features/auth/auth-context'

export function AppLayout() {
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="application-shell">
      <header className="app-header">
        <NavLink className="brand-link" to="/app">
          <span className="brand-mark" aria-hidden="true">
            S
          </span>
          <span>SMEFlow AI</span>
        </NavLink>

        <nav className="app-navigation" aria-label="Primary navigation">
          <NavLink to="/app" end>
            Home
          </NavLink>
          <NavLink to="/products">Products</NavLink>
          <NavLink to="/categories">Categories</NavLink>
          <NavLink to="/company">Company</NavLink>
        </nav>

        <div className="account-actions">
          <span className="account-name">
            {user?.firstName} {user?.lastName}
          </span>
          <button
            className="button button--secondary button--small"
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>
      </header>

      <main className="app-content">
        <Outlet />
      </main>
    </div>
  )
}
