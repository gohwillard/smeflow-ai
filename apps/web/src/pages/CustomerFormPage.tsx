import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '../api/client'
import {
  createCustomer,
  getCustomer,
  updateCustomer,
  type Customer,
  type CustomerCreateInput,
  type CustomerUpdateInput,
} from '../api/partners'
import { LoadingScreen } from '../components/LoadingScreen'
import { useAuth } from '../features/auth/auth-context'

type CustomerFormValues = {
  name: string
  registrationNumber: string
  contactPerson: string
  email: string
  phone: string
  billingAddress: string
  shippingAddress: string
  notes: string
}

type CustomerField = keyof CustomerFormValues
type FieldErrors = Partial<Record<CustomerField, string>>

const customerFields = new Set<CustomerField>([
  'name',
  'registrationNumber',
  'contactPerson',
  'email',
  'phone',
  'billingAddress',
  'shippingAddress',
  'notes',
])

const emptyForm: CustomerFormValues = {
  name: '',
  registrationNumber: '',
  contactPerson: '',
  email: '',
  phone: '',
  billingAddress: '',
  shippingAddress: '',
  notes: '',
}

function formFromCustomer(customer: Customer): CustomerFormValues {
  return {
    name: customer.name,
    registrationNumber: customer.registrationNumber ?? '',
    contactPerson: customer.contactPerson ?? '',
    email: customer.email ?? '',
    phone: customer.phone ?? '',
    billingAddress: customer.billingAddress ?? '',
    shippingAddress: customer.shippingAddress ?? '',
    notes: customer.notes ?? '',
  }
}

function validate(values: CustomerFormValues): FieldErrors {
  const errors: FieldErrors = {}
  const lengths: [CustomerField, number, string][] = [
    ['name', 200, 'Customer name'],
    ['registrationNumber', 100, 'Registration number'],
    ['contactPerson', 200, 'Contact person'],
    ['email', 320, 'Email'],
    ['phone', 50, 'Phone'],
    ['billingAddress', 2000, 'Billing address'],
    ['shippingAddress', 2000, 'Shipping address'],
    ['notes', 2000, 'Notes'],
  ]

  if (!values.name.trim()) errors.name = 'Customer name must not be blank.'
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

function createInput(values: CustomerFormValues): CustomerCreateInput {
  return {
    name: values.name.trim(),
    registrationNumber: nullable(values.registrationNumber),
    contactPerson: nullable(values.contactPerson),
    email: nullable(values.email),
    phone: nullable(values.phone),
    billingAddress: nullable(values.billingAddress),
    shippingAddress: nullable(values.shippingAddress),
    notes: nullable(values.notes),
  }
}

function updateInput(
  customer: Customer,
  values: CustomerFormValues,
): CustomerUpdateInput {
  const next = createInput(values)
  const input: CustomerUpdateInput = {}
  if (next.name !== customer.name) input.name = next.name
  if (next.registrationNumber !== customer.registrationNumber) {
    input.registrationNumber = next.registrationNumber
  }
  if (next.contactPerson !== customer.contactPerson) {
    input.contactPerson = next.contactPerson
  }
  if (next.email !== customer.email) input.email = next.email
  if (next.phone !== customer.phone) input.phone = next.phone
  if (next.billingAddress !== customer.billingAddress) {
    input.billingAddress = next.billingAddress
  }
  if (next.shippingAddress !== customer.shippingAddress) {
    input.shippingAddress = next.shippingAddress
  }
  if (next.notes !== customer.notes) input.notes = next.notes
  return input
}

function customerFormError(error: unknown): {
  fieldErrors: FieldErrors
  formError: string
} {
  if (!(error instanceof ApiError)) {
    return {
      fieldErrors: {},
      formError: 'The Customer could not be saved. Please try again.',
    }
  }
  if (error.status === 403) {
    return {
      fieldErrors: {},
      formError: 'You do not have permission to manage Customers.',
    }
  }
  if (error.code === 'VALIDATION_ERROR') {
    const fieldErrors: FieldErrors = {}
    for (const detail of error.details) {
      if (customerFields.has(detail.field as CustomerField)) {
        fieldErrors[detail.field as CustomerField] = detail.message
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

export function CustomerFormPage() {
  const { customerId } = useParams()
  const isEditing = Boolean(customerId)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [formValues, setFormValues] = useState<CustomerFormValues>(emptyForm)
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
    if (!canManage || !isEditing || !customerId) return
    const requestedCustomerId = customerId
    const controller = new AbortController()

    async function loadCustomer() {
      setCustomer(null)
      setLoadError(null)
      setNotFound(false)
      try {
        const loaded = await runAuthenticated((accessToken) =>
          getCustomer(accessToken, requestedCustomerId, controller.signal),
        )
        setCustomer(loaded)
        setFormValues(formFromCustomer(loaded))
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
        if (error instanceof ApiError && error.status === 404) {
          setNotFound(true)
        } else {
          setLoadError(
            error instanceof ApiError
              ? error.message
              : 'The Customer form could not be loaded. Please try again.',
          )
        }
      }
    }

    void loadCustomer()
    return () => controller.abort()
  }, [canManage, customerId, isEditing, retryCount, runAuthenticated])

  function updateField(field: CustomerField, value: string) {
    setFormValues((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
    setFormError(null)
  }

  async function submitCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canManage || isSubmitting || (isEditing && !customer)) return

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
        isEditing && customer
          ? updateCustomer(
              accessToken,
              customer.id,
              updateInput(customer, formValues),
            )
          : createCustomer(accessToken, createInput(formValues)),
      )
      navigate(`/customers/${saved.id}`, {
        replace: true,
        state: {
          successMessage: `Customer ${saved.name} ${
            isEditing ? 'updated' : 'created'
          } successfully.`,
        },
      })
    } catch (error) {
      const result = customerFormError(error)
      setFieldErrors(result.fieldErrors)
      setFormError(result.formError)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!canManage) {
    return (
      <section className="empty-state" aria-labelledby="customer-form-forbidden">
        <p className="card-label">Read-only access</p>
        <h1 id="customer-form-forbidden">Customer management unavailable</h1>
        <p>Your STAFF role can view Customers but cannot create or edit them.</p>
        <Link className="button button--secondary" to="/customers">
          Back to Customers
        </Link>
      </section>
    )
  }

  if (isEditing && !customer && !loadError && !notFound) {
    return <LoadingScreen message="Loading Customer form…" />
  }

  if (notFound) {
    return (
      <section className="empty-state" aria-labelledby="edit-customer-not-found">
        <p className="card-label">Customer unavailable</p>
        <h1 id="edit-customer-not-found">Customer not found</h1>
        <p>This Customer does not exist or is unavailable to your Company.</p>
        <Link className="button button--secondary" to="/customers">
          Back to Customers
        </Link>
      </section>
    )
  }

  const field = (
    name: CustomerField,
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
        aria-describedby={fieldErrors[name] ? `customer-${name}-error` : undefined}
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
        <small className="field-error" id={`customer-${name}-error`}>
          {fieldErrors[name]}
        </small>
      )}
    </label>
  )

  return (
    <section className="page-stack" aria-labelledby="customer-form-heading">
      <div className="breadcrumb-row">
        <Link to={customer ? `/customers/${customer.id}` : '/customers'}>
          ← {customer ? 'Customer details' : 'Customers'}
        </Link>
      </div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Sales master data</p>
          <h1 id="customer-form-heading">
            {isEditing ? 'Edit Customer' : 'Create Customer'}
          </h1>
          <p>
            {isEditing
              ? 'Update profile details without changing lifecycle status.'
              : 'Add a Customer for future quotations and sales workflows.'}
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

      {(!isEditing || customer) && (
        <form className="management-card product-form" noValidate onSubmit={submitCustomer}>
          {formError && (
            <div className="alert alert--error" role="alert">
              {formError}
            </div>
          )}

          <div className="form-section">
            <div className="form-section__heading">
              <h2>Identity and contact</h2>
              <p>Only the Customer name is required. Email is normalized by the backend.</p>
            </div>
            <div className="product-form__grid">
              {field('name', 'Customer name', 200)}
              {field('registrationNumber', 'Registration number', 100)}
              {field('contactPerson', 'Contact person', 200)}
              {field('email', 'Email', 320, 'email')}
              {field('phone', 'Phone', 50, 'tel')}
            </div>
          </div>

          <div className="form-section">
            <div className="form-section__heading">
              <h2>Addresses and notes</h2>
              <p>Clearing an optional field removes its saved value.</p>
            </div>
            <div className="product-form__grid">
              {(['billingAddress', 'shippingAddress', 'notes'] as const).map(
                (name) => (
                  <label className="field product-form__wide" key={name}>
                    <span>
                      {name === 'billingAddress'
                        ? 'Billing address'
                        : name === 'shippingAddress'
                          ? 'Shipping address'
                          : 'Notes'}{' '}
                      <span className="optional-label">Optional</span>
                    </span>
                    <textarea
                      aria-describedby={fieldErrors[name] ? `customer-${name}-error` : undefined}
                      aria-invalid={fieldErrors[name] ? 'true' : undefined}
                      disabled={isSubmitting}
                      maxLength={2000}
                      name={name}
                      onChange={(event) => updateField(name, event.target.value)}
                      rows={name === 'notes' ? 4 : 3}
                      value={formValues[name]}
                    />
                    {fieldErrors[name] && (
                      <small className="field-error" id={`customer-${name}-error`}>
                        {fieldErrors[name]}
                      </small>
                    )}
                  </label>
                ),
              )}
            </div>
          </div>

          <div className="form-actions">
            <Link
              className="button button--secondary"
              to={customer ? `/customers/${customer.id}` : '/customers'}
            >
              Cancel
            </Link>
            <button className="button button--primary" disabled={isSubmitting} type="submit">
              {isSubmitting
                ? 'Saving Customer…'
                : isEditing
                  ? 'Save changes'
                  : 'Create Customer'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
