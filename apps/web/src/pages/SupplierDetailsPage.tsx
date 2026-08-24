import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { ApiError } from '../api/client'
import {
  archiveSupplier,
  getSupplier,
  updateSupplier,
  type Supplier,
} from '../api/partners'
import { ConfirmationDialog } from '../components/ConfirmationDialog'
import { LifecycleBadge } from '../components/LifecycleBadge'
import { LoadingScreen } from '../components/LoadingScreen'
import { useAuth } from '../features/auth/auth-context'

type SupplierLocationState = { successMessage?: string }

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

export function SupplierDetailsPage() {
  const { supplierId = '' } = useParams()
  const location = useLocation()
  const locationState = location.state as SupplierLocationState | null
  const [supplier, setSupplier] = useState<Supplier | null>(null)
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

    async function loadSupplier() {
      setSupplier(null)
      setLoadError(null)
      setNotFound(false)
      try {
        setSupplier(
          await runAuthenticated((accessToken) =>
            getSupplier(accessToken, supplierId, controller.signal),
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
              : 'Supplier details could not be loaded. Please try again.',
          )
        }
      }
    }

    void loadSupplier()
    return () => controller.abort()
  }, [retryCount, runAuthenticated, supplierId])

  async function changeLifecycle() {
    if (
      !supplier ||
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
        supplier.isActive
          ? archiveSupplier(accessToken, supplier.id)
          : updateSupplier(accessToken, supplier.id, { isActive: true }),
      )
      setSupplier(updated)
      setSuccessMessage(
        `Supplier ${updated.name} ${updated.isActive ? 'reactivated' : 'archived'} successfully.`,
      )
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setSupplier(null)
        setNotFound(true)
      } else {
        setActionError(
          error instanceof ApiError && error.status === 403
            ? 'You do not have permission to manage Suppliers.'
            : error instanceof ApiError
              ? error.message
              : 'The Supplier could not be updated. Please try again.',
        )
      }
    } finally {
      lifecycleRequestRef.current = false
      setIsUpdatingLifecycle(false)
      setIsLifecycleDialogOpen(false)
    }
  }

  if (!supplier && !loadError && !notFound) {
    return <LoadingScreen message="Loading Supplier details…" />
  }

  if (notFound) {
    return (
      <section className="empty-state" aria-labelledby="supplier-not-found">
        <p className="card-label">Supplier unavailable</p>
        <h1 id="supplier-not-found">Supplier not found</h1>
        <p>This Supplier does not exist or is unavailable to your Company.</p>
        <Link className="button button--secondary" to="/suppliers">
          Back to Suppliers
        </Link>
      </section>
    )
  }

  return (
    <section className="page-stack" aria-labelledby="supplier-details-heading">
      <div className="breadcrumb-row">
        <Link to="/suppliers">← Suppliers</Link>
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

      {supplier && (
        <>
          <div className="page-heading">
            <div>
              <div className="title-with-status">
                <p className="eyebrow">Supplier profile</p>
                <LifecycleBadge isActive={supplier.isActive} />
              </div>
              <h1 id="supplier-details-heading">{supplier.name}</h1>
              <p>{supplier.contactPerson ?? 'No contact person provided.'}</p>
            </div>
            {canManage ? (
              <div className="row-actions">
                <Link
                  className="button button--secondary"
                  to={`/suppliers/${supplier.id}/edit`}
                >
                  Edit Supplier
                </Link>
                <button
                  className={`button ${
                    supplier.isActive ? 'button--danger' : 'button--primary'
                  }`}
                  disabled={isUpdatingLifecycle || isLifecycleDialogOpen}
                  onClick={() => setIsLifecycleDialogOpen(true)}
                  type="button"
                >
                  {supplier.isActive ? 'Archive Supplier' : 'Reactivate Supplier'}
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
                <dd>{supplier.name}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd><LifecycleBadge isActive={supplier.isActive} /></dd>
              </div>
              <div>
                <dt>Registration number</dt>
                <dd>{supplier.registrationNumber ?? '—'}</dd>
              </div>
              <div>
                <dt>Contact person</dt>
                <dd>{supplier.contactPerson ?? '—'}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{supplier.email ?? '—'}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{supplier.phone ?? '—'}</dd>
              </div>
              <div className="detail-grid__wide">
                <dt>Address</dt>
                <dd>{supplier.address ?? '—'}</dd>
              </div>
              <div className="detail-grid__wide">
                <dt>Notes</dt>
                <dd>{supplier.notes ?? '—'}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{formatDate(supplier.createdAt)}</dd>
              </div>
              <div>
                <dt>Last updated</dt>
                <dd>{formatDate(supplier.updatedAt)}</dd>
              </div>
            </dl>
          </article>

          {isLifecycleDialogOpen && (
            <ConfirmationDialog
              confirmLabel={
                supplier.isActive ? 'Archive Supplier' : 'Reactivate Supplier'
              }
              description={
                supplier.isActive
                  ? `“${supplier.name}” will be archived but retained for historical records.`
                  : `“${supplier.name}” will become active again.`
              }
              isDestructive={supplier.isActive}
              isPending={isUpdatingLifecycle}
              onCancel={() => setIsLifecycleDialogOpen(false)}
              onConfirm={changeLifecycle}
              pendingLabel={
                supplier.isActive
                  ? 'Archiving Supplier…'
                  : 'Reactivating Supplier…'
              }
              title={supplier.isActive ? 'Archive Supplier?' : 'Reactivate Supplier?'}
            />
          )}
        </>
      )}
    </section>
  )
}
