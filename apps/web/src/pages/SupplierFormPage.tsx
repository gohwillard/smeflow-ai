import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '../api/client'
import {
  createSupplier,
  getSupplier,
  updateSupplier,
  type Supplier,
  type SupplierCreateInput,
  type SupplierUpdateInput,
} from '../api/partners'
import { LoadingScreen } from '../components/LoadingScreen'
import { useAuth } from '../features/auth/auth-context'

type SupplierFormValues = {
  name: string
  registrationNumber: string
  contactPerson: string
  email: string
  phone: string
  address: string
  notes: string
}

type SupplierField = keyof SupplierFormValues
type FieldErrors = Partial<Record<SupplierField, string>>

const supplierFields = new Set<SupplierField>([
  'name',
  'registrationNumber',
  'contactPerson',
  'email',
  'phone',
  'address',
  'notes',
])

const emptyForm: SupplierFormValues = {
  name: '',
  registrationNumber: '',
  contactPerson: '',
  email: '',
  phone: '',
  address: '',
  notes: '',
}

function formFromSupplier(supplier: Supplier): SupplierFormValues {
  return {
    name: supplier.name,
    registrationNumber: supplier.registrationNumber ?? '',
    contactPerson: supplier.contactPerson ?? '',
    email: supplier.email ?? '',
    phone: supplier.phone ?? '',
    address: supplier.address ?? '',
    notes: supplier.notes ?? '',
  }
}

function validate(values: SupplierFormValues): FieldErrors {
  const errors: FieldErrors = {}
  const lengths: [SupplierField, number, string][] = [
    ['name', 200, 'Supplier name'],
    ['registrationNumber', 100, 'Registration number'],
    ['contactPerson', 200, 'Contact person'],
    ['email', 320, 'Email'],
    ['phone', 50, 'Phone'],
    ['address', 2000, 'Address'],
    ['notes', 2000, 'Notes'],
  ]

  if (!values.name.trim()) errors.name = 'Supplier name must not be blank.'
  for (const [field, maximum, label] of lengths) {
    if (values[field].trim().length > maximum) {
      errors[field] = `${label} must be at most ${maximum} characters.`
    }
  }
  const email = values.email.trim()
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid email address.'
  }
  return errors
}

function nullable(value: string): string | null {
  return value.trim() || null
}

function createInput(values: SupplierFormValues): SupplierCreateInput {
  return {
    name: values.name.trim(),
    registrationNumber: nullable(values.registrationNumber),
    contactPerson: nullable(values.contactPerson),
    email: nullable(values.email),
    phone: nullable(values.phone),
    address: nullable(values.address),
    notes: nullable(values.notes),
  }
}

function updateInput(
  supplier: Supplier,
  values: SupplierFormValues,
): SupplierUpdateInput {
  const next = createInput(values)
  const input: SupplierUpdateInput = {}
  if (next.name !== supplier.name) input.name = next.name
  if (next.registrationNumber !== supplier.registrationNumber) {
    input.registrationNumber = next.registrationNumber
  }
  if (next.contactPerson !== supplier.contactPerson) {
    input.contactPerson = next.contactPerson
  }
  if (next.email !== supplier.email) input.email = next.email
  if (next.phone !== supplier.phone) input.phone = next.phone
  if (next.address !== supplier.address) input.address = next.address
  if (next.notes !== supplier.notes) input.notes = next.notes
  return input
}

function supplierFormError(error: unknown): {
  fieldErrors: FieldErrors
  formError: string
} {
  if (!(error instanceof ApiError)) {
    return {
      fieldErrors: {},
      formError: 'The Supplier could not be saved. Please try again.',
    }
  }
  if (error.status === 403) {
    return {
      fieldErrors: {},
      formError: 'You do not have permission to manage Suppliers.',
    }
  }
  if (error.code === 'VALIDATION_ERROR') {
    const fieldErrors: FieldErrors = {}
    for (const detail of error.details) {
      if (supplierFields.has(detail.field as SupplierField)) {
        fieldErrors[detail.field as SupplierField] = detail.message
      }
    }
    return {
      fieldErrors,
      formError:
        Object.keys(fieldErrors).length > 0
          ? 'Review the highlighted fields and try again.'
          : error.message,
    }
  }
  return { fieldErrors: {}, formError: error.message }
}

export function SupplierFormPage() {
  const { supplierId } = useParams()
  const isEditing = Boolean(supplierId)
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [formValues, setFormValues] = useState<SupplierFormValues>(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const { runAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN'

  useEffect(() => {
    if (!canManage || !isEditing || !supplierId) return
    const requestedSupplierId = supplierId
    const controller = new AbortController()

    async function loadSupplier() {
      setSupplier(null)
      setLoadError(null)
      setNotFound(false)
      try {
        const loaded = await runAuthenticated((accessToken) =>
          getSupplier(accessToken, requestedSupplierId, controller.signal),
        )
        setSupplier(loaded)
        setFormValues(formFromSupplier(loaded))
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
        if (error instanceof ApiError && error.status === 404) {
          setNotFound(true)
        } else {
          setLoadError(
            error instanceof ApiError
              ? error.message
              : 'The Supplier form could not be loaded. Please try again.',
          )
        }
      }
    }

    void loadSupplier()
    return () => controller.abort()
  }, [canManage, isEditing, retryCount, runAuthenticated, supplierId])

  function updateField(field: SupplierField, value: string) {
    setFormValues((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
    setFormError(null)
  }

  async function submitSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canManage || isSubmitting || (isEditing && !supplier)) return

    const validationErrors = validate(formValues)
    setFieldErrors(validationErrors)
    setFormError(null)
    if (Object.keys(validationErrors).length > 0) {
      setFormError('Review the highlighted fields and try again.')
      return
    }

    setIsSubmitting(true)
    try {
      const saved = await runAuthenticated((accessToken) =>
        isEditing && supplier
          ? updateSupplier(
              accessToken,
              supplier.id,
              updateInput(supplier, formValues),
            )
          : createSupplier(accessToken, createInput(formValues)),
      )
      navigate(`/suppliers/${saved.id}`, {
        replace: true,
        state: {
          successMessage: `Supplier ${saved.name} ${
            isEditing ? 'updated' : 'created'
          } successfully.`,
        },
      })
    } catch (error) {
      const result = supplierFormError(error)
      setFieldErrors(result.fieldErrors)
      setFormError(result.formError)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!canManage) {
    return (
      <section className="empty-state" aria-labelledby="supplier-form-forbidden">
        <p className="card-label">Read-only access</p>
        <h1 id="supplier-form-forbidden">Supplier management unavailable</h1>
        <p>Your STAFF role can view Suppliers but cannot create or edit them.</p>
        <Link className="button button--secondary" to="/suppliers">
          Back to Suppliers
        </Link>
      </section>
    )
  }

  if (isEditing && !supplier && !loadError && !notFound) {
    return <LoadingScreen message="Loading Supplier form…" />
  }

  if (notFound) {
    return (
      <section className="empty-state" aria-labelledby="edit-supplier-not-found">
        <p className="card-label">Supplier unavailable</p>
        <h1 id="edit-supplier-not-found">Supplier not found</h1>
        <p>This Supplier does not exist or is unavailable to your Company.</p>
        <Link className="button button--secondary" to="/suppliers">
          Back to Suppliers
        </Link>
      </section>
    )
  }

  const field = (
    name: SupplierField,
    label: string,
    maximum: number,
    type = 'text',
  ) => (
    <label className="field">
      <span>
        {label}{' '}
        {name !== 'name' && <span className="optional-label">Optional</span>}
      </span>
      <input
        aria-describedby={fieldErrors[name] ? `supplier-${name}-error` : undefined}
        aria-invalid={fieldErrors[name] ? 'true' : undefined}
        disabled={isSubmitting}
        maxLength={maximum}
        name={name}
        onChange={(event) => updateField(name, event.target.value)}
        required={name === 'name'}
        type={type}
        value={formValues[name]}
      />
      {fieldErrors[name] && (
        <small className="field-error" id={`supplier-${name}-error`}>
          {fieldErrors[name]}
        </small>
      )}
    </label>
  )

  return (
    <section className="page-stack" aria-labelledby="supplier-form-heading">
      <div className="breadcrumb-row">
        <Link to={supplier ? `/suppliers/${supplier.id}` : '/suppliers'}>
          ← {supplier ? 'Supplier details' : 'Suppliers'}
        </Link>
      </div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Purchasing master data</p>
          <h1 id="supplier-form-heading">
            {isEditing ? 'Edit Supplier' : 'Create Supplier'}
          </h1>
          <p>
            {isEditing
              ? 'Update profile details without changing lifecycle status.'
              : 'Add a Supplier for future purchasing workflows.'}
          </p>
        </div>
      </div>

      {loadError && (
        <div className="alert alert--error" role="alert">
          <span>{loadError}</span>
          <button
            className="text-button"
            onClick={() => setRetryCount((value) => value + 1)}
            type="button"
          >
            Try again
          </button>
        </div>
      )}

      {(!isEditing || supplier) && (
        <form className="management-card product-form" noValidate onSubmit={submitSupplier}>
          {formError && (
            <div className="alert alert--error" role="alert">
              {formError}
            </div>
          )}

          <div className="form-section">
            <div className="form-section__heading">
              <h2>Identity and contact</h2>
              <p>Only the Supplier name is required. Email is normalized by the backend.</p>
            </div>
            <div className="product-form__grid">
              {field('name', 'Supplier name', 200)}
              {field('registrationNumber', 'Registration number', 100)}
              {field('contactPerson', 'Contact person', 200)}
              {field('email', 'Email', 320, 'email')}
              {field('phone', 'Phone', 50, 'tel')}
            </div>
          </div>

          <div className="form-section">
            <div className="form-section__heading">
              <h2>Address and notes</h2>
              <p>Clearing an optional field removes its saved value.</p>
            </div>
            <div className="product-form__grid">
              {(['address', 'notes'] as const).map((name) => (
                <label className="field product-form__wide" key={name}>
                  <span>
                    {name === 'address' ? 'Address' : 'Notes'}{' '}
                    <span className="optional-label">Optional</span>
                  </span>
                  <textarea
                    aria-describedby={fieldErrors[name] ? `supplier-${name}-error` : undefined}
                    aria-invalid={fieldErrors[name] ? 'true' : undefined}
                    disabled={isSubmitting}
                    maxLength={2000}
                    name={name}
                    onChange={(event) => updateField(name, event.target.value)}
                    rows={name === 'notes' ? 4 : 3}
                    value={formValues[name]}
                  />
                  {fieldErrors[name] && (
                    <small className="field-error" id={`supplier-${name}-error`}>
                      {fieldErrors[name]}
                    </small>
                  )}
                </label>
              ))}
            </div>
          </div>

          <div className="form-actions">
            <Link
              className="button button--secondary"
              to={supplier ? `/suppliers/${supplier.id}` : '/suppliers'}
            >
              Cancel
            </Link>
            <button className="button button--primary" disabled={isSubmitting} type="submit">
              {isSubmitting
                ? 'Saving Supplier…'
                : isEditing
                  ? 'Save changes'
                  : 'Create Supplier'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
