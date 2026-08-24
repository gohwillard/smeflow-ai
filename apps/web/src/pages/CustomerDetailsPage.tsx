import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { ApiError } from '../api/client'
import {
  archiveCustomer,
  getCustomer,
  updateCustomer,
  type Customer,
} from '../api/partners'
import { ConfirmationDialog } from '../components/ConfirmationDialog'
import { LifecycleBadge } from '../components/LifecycleBadge'
import { LoadingScreen } from '../components/LoadingScreen'
import { useAuth } from '../features/auth/auth-context'

type CustomerLocationState = { successMessage?: string }

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

export function CustomerDetailsPage() {
  const { customerId = '' } = useParams()
  const location = useLocation()
  const locationState = location.state as CustomerLocationState | null
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(
    locationState?.successMessage ?? null,
  )
  const [isLifecycleDialogOpen, setIsLifecycleDialogOpen] = useState(false)
  const [isUpdatingLifecycle, setIsUpdatingLifecycle] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const lifecycleRequestRef = useRef(false)
  const { runAuthenticated, user } = useAuth()
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN'

  useEffect(() => {
    const controller = new AbortController()

    async function loadCustomer() {
      setCustomer(null)
      setLoadError(null)
      setNotFound(false)
      try {
        setCustomer(
          await runAuthenticated((accessToken) =>
            getCustomer(accessToken, customerId, controller.signal),
          ),
        )
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
        if (error instanceof ApiError && error.status === 404) {
          setNotFound(true)
        } else {
          setLoadError(
            error instanceof ApiError
              ? error.message
              : 'Customer details could not be loaded. Please try again.',
          )
        }
      }
    }

    void loadCustomer()
    return () => controller.abort()
  }, [customerId, retryCount, runAuthenticated])

  async function changeLifecycle() {
    if (
      !customer ||
      !canManage ||
      isUpdatingLifecycle ||
      lifecycleRequestRef.current
    ) {
      return
    }

    lifecycleRequestRef.current = true
    setIsUpdatingLifecycle(true)
    setActionError(null)
    setSuccessMessage(null)

    try {
      const updated = await runAuthenticated((accessToken) =>
        customer.isActive
          ? archiveCustomer(accessToken, customer.id)
          : updateCustomer(accessToken, customer.id, { isActive: true }),
      )
      setCustomer(updated)
      setSuccessMessage(
        `Customer ${updated.name} ${updated.isActive ? 'reactivated' : 'archived'} successfully.`,
      )
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setCustomer(null)
        setNotFound(true)
      } else {
        setActionError(
          error instanceof ApiError && error.status === 403
            ? 'You do not have permission to manage Customers.'
            : error instanceof ApiError
              ? error.message
              : 'The Customer could not be updated. Please try again.',
        )
      }
    } finally {
      lifecycleRequestRef.current = false
      setIsUpdatingLifecycle(false)
      setIsLifecycleDialogOpen(false)
    }
  }

  if (!customer && !loadError && !notFound) {
    return <LoadingScreen message="Loading Customer details…" />
  }

  if (notFound) {
    return (
      <section className="empty-state" aria-labelledby="customer-not-found">
        <p className="card-label">Customer unavailable</p>
        <h1 id="customer-not-found">Customer not found</h1>
        <p>This Customer does not exist or is unavailable to your Company.</p>
        <Link className="button button--secondary" to="/customers">
          Back to Customers
        </Link>
      </section>
    )
  }

  return (
    <section className="page-stack" aria-labelledby="customer-details-heading">
      <div className="breadcrumb-row">
        <Link to="/customers">← Customers</Link>
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

      {customer && (
        <>
          <div className="page-heading">
            <div>
              <div className="title-with-status">
                <p className="eyebrow">Customer profile</p>
                <LifecycleBadge isActive={customer.isActive} />
              </div>
              <h1 id="customer-details-heading">{customer.name}</h1>
            </div>
            {canManage ? (
              <div className="row-actions">
                <Link
                  className="button button--secondary"
                  to={`/customers/${customer.id}/edit`}
                >
                  Edit Customer
                </Link>
                <button
                  className={`button ${
                    customer.isActive ? 'button--danger' : 'button--primary'
                  }`}
                  disabled={isUpdatingLifecycle || isLifecycleDialogOpen}
                  onClick={() => setIsLifecycleDialogOpen(true)}
                  type="button"
                >
                  {customer.isActive ? 'Archive Customer' : 'Reactivate Customer'}
                </button>
              </div>
            ) : (
              <span className="read-only-badge">Read only</span>
            )}
          </div>

          {successMessage && (
            <div className="alert alert--success" role="status">
              {successMessage}
            </div>
          )}
          {actionError && (
            <div className="alert alert--error" role="alert">
              {actionError}
            </div>
          )}

          <article className="management-card">
            <dl className="detail-grid party-detail-grid">
              <div>
                <dt>Name</dt>
                <dd>{customer.name}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd><LifecycleBadge isActive={customer.isActive} /></dd>
              </div>
              <div>
                <dt>Registration number</dt>
                <dd>{customer.registrationNumber ?? '—'}</dd>
              </div>
              <div>
                <dt>Contact person</dt>
                <dd>{customer.contactPerson ?? '—'}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{customer.email ?? '—'}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{customer.phone ?? '—'}</dd>
              </div>
              <div className="detail-grid__wide">
                <dt>Billing address</dt>
                <dd>{customer.billingAddress ?? '—'}</dd>
              </div>
              <div className="detail-grid__wide">
                <dt>Shipping address</dt>
                <dd>{customer.shippingAddress ?? '—'}</dd>
              </div>
              <div className="detail-grid__wide">
                <dt>Notes</dt>
                <dd>{customer.notes ?? '—'}</dd>
              </div>
              <div className="detail-grid__metadata-start">
                <dt>Created</dt>
                <dd>{formatDate(customer.createdAt)}</dd>
              </div>
              <div className="detail-grid__metadata-end">
                <dt>Last updated</dt>
                <dd>{formatDate(customer.updatedAt)}</dd>
              </div>
            </dl>
          </article>

          {isLifecycleDialogOpen && (
            <ConfirmationDialog
              confirmLabel={
                customer.isActive ? 'Archive Customer' : 'Reactivate Customer'
              }
              description={
                customer.isActive
                  ? `“${customer.name}” will be archived but retained for historical records.`
                  : `“${customer.name}” will become active again.`
              }
              isDestructive={customer.isActive}
              isPending={isUpdatingLifecycle}
              onCancel={() => setIsLifecycleDialogOpen(false)}
              onConfirm={changeLifecycle}
              pendingLabel={
                customer.isActive
                  ? 'Archiving Customer…'
                  : 'Reactivating Customer…'
              }
              title={customer.isActive ? 'Archive Customer?' : 'Reactivate Customer?'}
            />
          )}
        </>
      )}
    </section>
  )
}
