import { Navigate, Outlet } from 'react-router'
import { useAuth } from '../features/auth/auth-context'

export function PublicOnlyRoute() {
  const { status } = useAuth()

  if (status === 'authenticated') {
    return <Navigate replace to="/app" />
  }

  return <Outlet />
}
