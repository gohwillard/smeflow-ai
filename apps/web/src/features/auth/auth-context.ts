import { createContext, useContext } from 'react'
import type {
  AuthenticatedUser,
  LoginInput,
  RegistrationInput,
} from '../../api/auth'

export type AuthenticationStatus =
  | 'unauthenticated'
  | 'authenticating'
  | 'authenticated'

export type AuthContextValue = {
  accessToken: string | null
  user: AuthenticatedUser | null
  status: AuthenticationStatus
  login: (input: LoginInput) => Promise<void>
  register: (input: RegistrationInput) => Promise<void>
  logout: () => void
  runAuthenticated: <T>(
    operation: (accessToken: string) => Promise<T>,
  ) => Promise<T>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
