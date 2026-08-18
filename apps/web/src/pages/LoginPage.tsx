import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { ApiError } from '../api/client'
import { PasswordField } from '../components/PasswordField'
import { useAuth } from '../features/auth/auth-context'
import type { FormEvent } from 'react'

type LoginLocationState = {
  registrationComplete?: boolean
}

function getLoginError(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'An unexpected error occurred. Please try again.'
  }

  if (error.code === 'INVALID_CREDENTIALS') {
    return 'Invalid email or password.'
  }

  if (error.code === 'ACCOUNT_INACTIVE') {
    return 'This account is inactive. Contact your administrator.'
  }

  return error.message
}

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const { login, status } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as LoginLocationState | null
  const isSubmitting = status === 'authenticating'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)

    const credentials = { email, password }
    setPassword('')

    try {
      await login(credentials)
      navigate('/app', { replace: true })
    } catch (error) {
      setErrorMessage(getLoginError(error))
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-card__heading">
        <p className="eyebrow">Welcome back</p>
        <h2>Sign in to SMEFlow</h2>
        <p>Use your company account to continue.</p>
      </div>

      {locationState?.registrationComplete && (
        <div className="alert alert--success" role="status">
          Registration complete. Sign in with your new account.
        </div>
      )}

      {errorMessage && (
        <div className="alert alert--error" role="alert">
          {errorMessage}
        </div>
      )}

      <form className="form-stack" onSubmit={handleSubmit}>
        <label className="field">
          <span>Email address</span>
          <input
            autoComplete="email"
            disabled={isSubmitting}
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>

        <PasswordField
          autoComplete="current-password"
          disabled={isSubmitting}
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          required
          value={password}
        />

        <button
          className="button button--primary"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="auth-switch">
        New to SMEFlow? <Link to="/register">Create an account</Link>
      </p>
    </div>
  )
}
