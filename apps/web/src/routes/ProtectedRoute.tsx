import { Navigate, Outlet, useLocation } from 'react-router'
import { LoadingScreen } from '../components/LoadingScreen'
import { useAuth } from '../features/auth/auth-context'

export function ProtectedRoute() {
  const { accessToken, status, user } = useAuth()
  const location = useLocation()

  if (status === 'authenticating') {
    return <LoadingScreen message="Confirming your account…" />
  }

  if (!accessToken || !user || status !== 'authenticated') {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />
  }

  return <Outlet />
}
