import { useCallback, useMemo, useState } from 'react'
import {
  getCurrentUser,
  loginUser,
  registerCompanyOwner,
  type AuthenticatedUser,
  type LoginInput,
  type RegistrationInput,
} from '../../api/auth'
import { ApiError } from '../../api/client'
import {
  AuthContext,
  type AuthenticationStatus,
} from './auth-context'
import type { ReactNode } from 'react'

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [status, setStatus] =
    useState<AuthenticationStatus>('unauthenticated')

  const clearAuthentication = useCallback(() => {
    setAccessToken(null)
    setUser(null)
    setStatus('unauthenticated')
  }, [])

  const login = useCallback(
    async (input: LoginInput) => {
      setStatus('authenticating')

      try {
        const authentication = await loginUser(input)
        const currentUser = await getCurrentUser(authentication.accessToken)

        setAccessToken(authentication.accessToken)
        setUser(currentUser)
        setStatus('authenticated')
      } catch (error) {
        clearAuthentication()
        throw error
      }
    },
    [clearAuthentication],
  )

  const register = useCallback(async (input: RegistrationInput) => {
    await registerCompanyOwner(input)
  }, [])

  const runAuthenticated = useCallback(
    async <T,>(
      operation: (currentAccessToken: string) => Promise<T>,
    ): Promise<T> => {
      if (!accessToken) {
        clearAuthentication()
        throw new ApiError(
          401,
          'AUTHENTICATION_REQUIRED',
          'Please sign in to continue.',
        )
      }

      try {
        return await operation(accessToken)
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          clearAuthentication()
        }

        throw error
      }
    },
    [accessToken, clearAuthentication],
  )

  const value = useMemo(
    () => ({
      accessToken,
      user,
      status,
      login,
      register,
      logout: clearAuthentication,
      runAuthenticated,
    }),
    [
      accessToken,
      clearAuthentication,
      login,
      register,
      runAuthenticated,
      status,
      user,
    ],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
