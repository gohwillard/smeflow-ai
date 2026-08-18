import { useId, useState } from 'react'
import type { ChangeEventHandler, ReactNode } from 'react'

type PasswordFieldProps = {
  autoComplete: 'current-password' | 'new-password'
  description?: ReactNode
  descriptionClassName?: 'field-help' | 'field-error'
  disabled?: boolean
  label?: string
  maxLength?: number
  minLength?: number
  name: string
  onChange: ChangeEventHandler<HTMLInputElement>
  required?: boolean
  value: string
}

function VisibilityIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.9 4.2A10.8 10.8 0 0112 4c5.5 0 9 5.4 9 5.4a14 14 0 01-2.1 2.6M6.2 6.3C4.2 7.7 3 9.4 3 9.4s3.5 5.4 9 5.4c1.2 0 2.3-.2 3.3-.6" />
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M3 12s3.5-5.5 9-5.5 9 5.5 9 5.5-3.5 5.5-9 5.5S3 12 3 12z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  )
}

export function PasswordField({
  autoComplete,
  description,
  descriptionClassName = 'field-help',
  disabled = false,
  label = 'Password',
  maxLength,
  minLength,
  name,
  onChange,
  required = false,
  value,
}: PasswordFieldProps) {
  const generatedId = useId()
  const [showPassword, setShowPassword] = useState(false)
  const inputId = `${name}-${generatedId}`
  const descriptionId = description ? `${inputId}-description` : undefined
  const visibilityLabel = showPassword ? 'Hide password' : 'Show password'

  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <div className="password-input">
        <input
          aria-describedby={descriptionId}
          autoComplete={autoComplete}
          disabled={disabled}
          id={inputId}
          maxLength={maxLength}
          minLength={minLength}
          name={name}
          onChange={onChange}
          required={required}
          type={showPassword ? 'text' : 'password'}
          value={value}
        />
        <button
          aria-label={visibilityLabel}
          className="password-toggle"
          disabled={disabled}
          onClick={() => setShowPassword((visible) => !visible)}
          type="button"
        >
          <VisibilityIcon visible={showPassword} />
        </button>
      </div>
      {description && (
        <small className={descriptionClassName} id={descriptionId}>
          {description}
        </small>
      )}
    </div>
  )
}
