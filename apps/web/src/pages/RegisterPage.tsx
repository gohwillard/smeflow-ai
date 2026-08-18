import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ApiError } from '../api/client'
import { PasswordField } from '../components/PasswordField'
import { useAuth } from '../features/auth/auth-context'
import type { FormEvent } from 'react'

type RegistrationField =
  | 'companyName'
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'password'

type FieldErrors = Partial<Record<RegistrationField, string>>

const registrationFields = new Set<RegistrationField>([
  'companyName',
  'firstName',
  'lastName',
  'email',
  'password',
])

function getRegistrationErrors(error: unknown): {
  formError: string | null
  fieldErrors: FieldErrors
} {
  if (!(error instanceof ApiError)) {
    return {
      formError: 'An unexpected error occurred. Please try again.',
      fieldErrors: {},
    }
  }

  if (error.code === 'EMAIL_ALREADY_EXISTS') {
    return {
      formError: null,
      fieldErrors: { email: 'An account with this email already exists.' },
    }
  }

  if (error.code === 'VALIDATION_ERROR') {
    const fieldErrors: FieldErrors = {}

    for (const detail of error.details) {
      if (registrationFields.has(detail.field as RegistrationField)) {
        fieldErrors[detail.field as RegistrationField] = detail.message
      }
    }

    return {
      formError:
        Object.keys(fieldErrors).length === 0 ? error.message : null,
      fieldErrors,
    }
  }

  return { formError: error.message, fieldErrors: {} }
}

export function RegisterPage() {
  const [companyName, setCompanyName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFieldErrors({})
    setFormError(null)
    setIsSubmitting(true)

    const registration = {
      companyName,
      firstName,
      lastName,
      email,
      password,
    }
    setPassword('')

    try {
      await register(registration)
      navigate('/login', {
        replace: true,
        state: { registrationComplete: true },
      })
    } catch (error) {
      const errors = getRegistrationErrors(error)
      setFieldErrors(errors.fieldErrors)
      setFormError(errors.formError)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-card auth-card--wide">
      <div className="auth-card__heading">
        <p className="eyebrow">Get started</p>
        <h2>Create your company account</h2>
        <p>Your first user will be created as the company owner.</p>
      </div>

      {formError && (
        <div className="alert alert--error" role="alert">
          {formError}
        </div>
      )}

      <form className="form-stack" onSubmit={handleSubmit}>
        <label className="field">
          <span>Company name</span>
          <input
            aria-describedby={
              fieldErrors.companyName ? 'companyName-error' : undefined
            }
            disabled={isSubmitting}
            name="companyName"
            onChange={(event) => setCompanyName(event.target.value)}
            required
            value={companyName}
          />
          {fieldErrors.companyName && (
            <small className="field-error" id="companyName-error">
              {fieldErrors.companyName}
            </small>
          )}
        </label>

        <div className="form-row">
          <label className="field">
            <span>First name</span>
            <input
              aria-describedby={
                fieldErrors.firstName ? 'firstName-error' : undefined
              }
              disabled={isSubmitting}
              name="firstName"
              onChange={(event) => setFirstName(event.target.value)}
              required
              value={firstName}
            />
            {fieldErrors.firstName && (
              <small className="field-error" id="firstName-error">
                {fieldErrors.firstName}
              </small>
            )}
          </label>

          <label className="field">
            <span>Last name</span>
            <input
              aria-describedby={
                fieldErrors.lastName ? 'lastName-error' : undefined
              }
              disabled={isSubmitting}
              name="lastName"
              onChange={(event) => setLastName(event.target.value)}
              required
              value={lastName}
            />
            {fieldErrors.lastName && (
              <small className="field-error" id="lastName-error">
                {fieldErrors.lastName}
              </small>
            )}
          </label>
        </div>

        <label className="field">
          <span>Email address</span>
          <input
            aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            autoComplete="email"
            disabled={isSubmitting}
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
          {fieldErrors.email && (
            <small className="field-error" id="email-error">
              {fieldErrors.email}
            </small>
          )}
        </label>

        <PasswordField
          autoComplete="new-password"
          description={
            fieldErrors.password ?? 'Use 15–128 characters.'
          }
          descriptionClassName={
            fieldErrors.password ? 'field-error' : 'field-help'
          }
          disabled={isSubmitting}
          maxLength={128}
          minLength={15}
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
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="auth-switch">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </div>
  )
}
