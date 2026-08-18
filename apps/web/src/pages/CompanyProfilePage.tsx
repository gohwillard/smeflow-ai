import { useEffect, useState } from 'react'
import {
  getCompanyProfile,
  updateCompanyProfile,
  type CompanyProfile,
  type CompanyProfileUpdate,
} from '../api/company'
import { ApiError } from '../api/client'
import { LoadingScreen } from '../components/LoadingScreen'
import { useAuth } from '../features/auth/auth-context'
import type { FormEvent } from 'react'

type CompanyProfileFormValues = {
  name: string
  registrationNumber: string
  email: string
  phone: string
  address: string
}

type CompanyProfileField = keyof CompanyProfileFormValues
type FieldErrors = Partial<Record<CompanyProfileField, string>>

const companyProfileFields = new Set<CompanyProfileField>([
  'name',
  'registrationNumber',
  'email',
  'phone',
  'address',
])

const companyEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function displayValue(value: string | null): string {
  return value ?? 'Not provided'
}

function createFormValues(company: CompanyProfile): CompanyProfileFormValues {
  return {
    name: company.name,
    registrationNumber: company.registrationNumber ?? '',
    email: company.email ?? '',
    phone: company.phone ?? '',
    address: company.address ?? '',
  }
}

function normalizeOptional(value: string): string | null {
  const normalized = value.trim()
  return normalized === '' ? null : normalized
}

function createUpdate(
  company: CompanyProfile,
  values: CompanyProfileFormValues,
): { fieldErrors: FieldErrors; input: CompanyProfileUpdate } {
  const fieldErrors: FieldErrors = {}
  const input: CompanyProfileUpdate = {}
  const name = values.name.trim()
  const registrationNumber = normalizeOptional(values.registrationNumber)
  const emailValue = normalizeOptional(values.email)
  const email = emailValue?.toLowerCase() ?? null
  const phone = normalizeOptional(values.phone)
  const address = normalizeOptional(values.address)

  if (name === '') {
    fieldErrors.name = 'Company name must not be blank.'
  } else if (name !== company.name) {
    input.name = name
  }

  if (email !== null && !companyEmailPattern.test(email)) {
    fieldErrors.email = 'Enter a valid company email address.'
  }

  if (registrationNumber !== company.registrationNumber) {
    input.registrationNumber = registrationNumber
  }

  if (email !== company.email) {
    input.email = email
  }

  if (phone !== company.phone) {
    input.phone = phone
  }

  if (address !== company.address) {
    input.address = address
  }

  return { fieldErrors, input }
}

function getLoadError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return 'You are signed in, but you do not have permission to view this profile.'
    }

    return error.message
  }

  return 'The company profile could not be loaded.'
}

function getSaveErrors(error: unknown): {
  fieldErrors: FieldErrors
  formError: string
} {
  if (!(error instanceof ApiError)) {
    return {
      fieldErrors: {},
      formError: 'The company profile could not be updated. Please try again.',
    }
  }

  if (error.status === 403) {
    return {
      fieldErrors: {},
      formError:
        'You are signed in, but you do not have permission to update this profile.',
    }
  }

  if (error.code === 'VALIDATION_ERROR') {
    const fieldErrors: FieldErrors = {}

    for (const detail of error.details) {
      if (companyProfileFields.has(detail.field as CompanyProfileField)) {
        fieldErrors[detail.field as CompanyProfileField] = detail.message
      }
    }

    return {
      fieldErrors,
      formError:
        Object.keys(fieldErrors).length === 0
          ? error.message
          : 'Review the highlighted fields and try again.',
    }
  }

  return { fieldErrors: {}, formError: error.message }
}

export function CompanyProfilePage() {
  const [company, setCompany] = useState<CompanyProfile | null>(null)
  const [formValues, setFormValues] =
    useState<CompanyProfileFormValues | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { runAuthenticated, user } = useAuth()
  const canEdit = user?.role === 'OWNER' || user?.role === 'ADMIN'

  useEffect(() => {
    const controller = new AbortController()

    async function loadCompany() {
      setLoadError(null)

      try {
        const profile = await runAuthenticated((accessToken) =>
          getCompanyProfile(accessToken, controller.signal),
        )
        setCompany(profile)
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return
        }

        setLoadError(getLoadError(error))
      }
    }

    void loadCompany()

    return () => controller.abort()
  }, [retryCount, runAuthenticated])

  function startEditing() {
    if (!company || !canEdit) {
      return
    }

    setFormValues(createFormValues(company))
    setFieldErrors({})
    setSaveError(null)
    setSuccessMessage(null)
    setIsEditing(true)
  }

  function cancelEditing() {
    setFormValues(null)
    setFieldErrors({})
    setSaveError(null)
    setIsEditing(false)
  }

  function updateFormValue(field: CompanyProfileField, value: string) {
    setFormValues((current) =>
      current ? { ...current, [field]: value } : current,
    )
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
    setSaveError(null)
  }

  async function saveChanges(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!company || !formValues || isSubmitting) {
      return
    }

    const update = createUpdate(company, formValues)
    setFieldErrors(update.fieldErrors)
    setSaveError(null)
    setSuccessMessage(null)

    if (Object.keys(update.fieldErrors).length > 0) {
      return
    }

    if (Object.keys(update.input).length === 0) {
      cancelEditing()
      return
    }

    setIsSubmitting(true)

    try {
      const updatedCompany = await runAuthenticated((accessToken) =>
        updateCompanyProfile(accessToken, update.input),
      )
      setCompany(updatedCompany)
      setFormValues(null)
      setIsEditing(false)
      setSuccessMessage('Company profile updated successfully.')
    } catch (error) {
      const errors = getSaveErrors(error)
      setFieldErrors(errors.fieldErrors)
      setSaveError(errors.formError)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!company && !loadError) {
    return <LoadingScreen message="Loading company profile…" />
  }

  return (
    <section className="page-stack" aria-labelledby="company-heading">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Company</p>
          <h1 id="company-heading">Company profile</h1>
          <p>Your protected company details from the SMEFlow API.</p>
        </div>

        {company && canEdit && !isEditing && (
          <button
            className="button button--secondary"
            onClick={startEditing}
            type="button"
          >
            Edit profile
          </button>
        )}

        {!canEdit && <span className="read-only-badge">Read only</span>}
      </div>

      {loadError && (
        <div className="alert alert--error" role="alert">
          <span>{loadError}</span>
          <button
            className="text-button"
            onClick={() => setRetryCount((count) => count + 1)}
            type="button"
          >
            Try again
          </button>
        </div>
      )}

      {successMessage && (
        <div className="alert alert--success" role="status">
          {successMessage}
        </div>
      )}

      {company && !isEditing && (
        <article className="profile-card">
          <div className="profile-card__title">
            <span className="company-avatar" aria-hidden="true">
              {company.name.charAt(0).toUpperCase()}
            </span>
            <div>
              <p className="card-label">Company name</p>
              <h2>{company.name}</h2>
            </div>
          </div>

          <dl className="profile-details">
            <div>
              <dt>Registration number</dt>
              <dd>{displayValue(company.registrationNumber)}</dd>
            </div>
            <div>
              <dt>Contact email</dt>
              <dd>{displayValue(company.email)}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{displayValue(company.phone)}</dd>
            </div>
            <div className="profile-details__wide">
              <dt>Address</dt>
              <dd>{displayValue(company.address)}</dd>
            </div>
          </dl>
        </article>
      )}

      {company && isEditing && formValues && (
        <form
          className="profile-card profile-form"
          noValidate
          onSubmit={saveChanges}
        >
          <div className="profile-card__title">
            <span className="company-avatar" aria-hidden="true">
              {company.name.charAt(0).toUpperCase()}
            </span>
            <div>
              <p className="card-label">Editing</p>
              <h2>Company details</h2>
            </div>
          </div>

          {saveError && (
            <div className="alert alert--error" role="alert">
              {saveError}
            </div>
          )}

          <div className="profile-form__fields">
            <label className="field profile-form__wide">
              <span>Company name</span>
              <input
                aria-describedby={fieldErrors.name ? 'company-name-error' : undefined}
                aria-invalid={fieldErrors.name ? 'true' : undefined}
                disabled={isSubmitting}
                name="name"
                onChange={(event) => updateFormValue('name', event.target.value)}
                required
                value={formValues.name}
              />
              {fieldErrors.name && (
                <small className="field-error" id="company-name-error">
                  {fieldErrors.name}
                </small>
              )}
            </label>

            <label className="field">
              <span>Registration number</span>
              <input
                aria-describedby={
                  fieldErrors.registrationNumber
                    ? 'registration-number-error'
                    : undefined
                }
                aria-invalid={
                  fieldErrors.registrationNumber ? 'true' : undefined
                }
                disabled={isSubmitting}
                name="registrationNumber"
                onChange={(event) =>
                  updateFormValue('registrationNumber', event.target.value)
                }
                value={formValues.registrationNumber}
              />
              {fieldErrors.registrationNumber && (
                <small className="field-error" id="registration-number-error">
                  {fieldErrors.registrationNumber}
                </small>
              )}
            </label>

            <label className="field">
              <span>Contact email</span>
              <input
                aria-describedby={
                  fieldErrors.email ? 'company-email-error' : undefined
                }
                aria-invalid={fieldErrors.email ? 'true' : undefined}
                autoComplete="email"
                disabled={isSubmitting}
                name="email"
                onChange={(event) => updateFormValue('email', event.target.value)}
                type="email"
                value={formValues.email}
              />
              {fieldErrors.email && (
                <small className="field-error" id="company-email-error">
                  {fieldErrors.email}
                </small>
              )}
            </label>

            <label className="field">
              <span>Phone</span>
              <input
                aria-describedby={
                  fieldErrors.phone ? 'company-phone-error' : undefined
                }
                aria-invalid={fieldErrors.phone ? 'true' : undefined}
                autoComplete="tel"
                disabled={isSubmitting}
                name="phone"
                onChange={(event) => updateFormValue('phone', event.target.value)}
                type="tel"
                value={formValues.phone}
              />
              {fieldErrors.phone && (
                <small className="field-error" id="company-phone-error">
                  {fieldErrors.phone}
                </small>
              )}
            </label>

            <label className="field profile-form__wide">
              <span>Address</span>
              <textarea
                aria-describedby={
                  fieldErrors.address ? 'company-address-error' : undefined
                }
                aria-invalid={fieldErrors.address ? 'true' : undefined}
                disabled={isSubmitting}
                name="address"
                onChange={(event) => updateFormValue('address', event.target.value)}
                rows={4}
                value={formValues.address}
              />
              {fieldErrors.address && (
                <small className="field-error" id="company-address-error">
                  {fieldErrors.address}
                </small>
              )}
            </label>
          </div>

          <div className="profile-form__actions">
            <button
              className="button button--secondary"
              disabled={isSubmitting}
              onClick={cancelEditing}
              type="button"
            >
              Cancel
            </button>
            <button
              className="button button--primary"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Saving changes…' : 'Save changes'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
