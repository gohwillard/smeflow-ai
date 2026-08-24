import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { ApiError } from '../api/client'
import {
  archiveSupplier,
  getSuppliers,
  updateSupplier,
  type Supplier,
} from '../api/partners'
import { ConfirmationDialog } from '../components/ConfirmationDialog'
import { LifecycleBadge } from '../components/LifecycleBadge'
import { LoadingScreen } from '../components/LoadingScreen'
import { useAuth } from '../features/auth/auth-context'

function replaceSupplier(suppliers: Supplier[], next: Supplier): Supplier[] {
  return suppliers.map((supplier) =>
    supplier.id === next.id ? next : supplier,
  )
}

export function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [lifecycleTarget, setLifecycleTarget] = useState<Supplier | null>(null)
  const [pendingSupplierId, setPendingSupplierId] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const lifecycleRequestRef = useRef(false)
  const { runAuthenticated, user } = useAuth()
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN'

  useEffect(() => {
    const controller = new AbortController()

    async function loadSuppliers() {
      setLoadError(null)
      setSuppliers(null)
      try {
        setSuppliers(
          await runAuthenticated((accessToken) =>
            getSuppliers(accessToken, controller.signal),
          ),
        )
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
        setLoadError(
          error instanceof ApiError
            ? error.message
            : 'Suppliers could not be loaded. Please try again.',
        )
      }
    }

    void loadSuppliers()
    return () => controller.abort()
  }, [retryCount, runAuthenticated])

  async function confirmLifecycleChange() {
    const supplier = lifecycleTarget
    if (
      !supplier ||
      !canManage ||
      pendingSupplierId ||
      lifecycleRequestRef.current
    ) {
      return
    }

    lifecycleRequestRef.current = true
    setPendingSupplierId(supplier.id)
    setActionError(null)
    setSuccessMessage(null)

    try {
      const updated = await runAuthenticated((accessToken) =>
        supplier.isActive
          ? archiveSupplier(accessToken, supplier.id)
          : updateSupplier(accessToken, supplier.id, { isActive: true }),
      )
      setSuppliers((current) => replaceSupplier(current ?? [], updated))
      setSuccessMessage(
        `Supplier ${updated.name} ${updated.isActive ? 'reactivated' : 'archived'} successfully.`,
      )
    } catch (error) {
      setActionError(
        error instanceof ApiError && error.status === 403
          ? 'You do not have permission to manage Suppliers.'
          : error instanceof ApiError
            ? error.message
            : 'The Supplier could not be updated. Please try again.',
      )
    } finally {
      lifecycleRequestRef.current = false
      setPendingSupplierId(null)
      setLifecycleTarget(null)
    }
  }

  if (!suppliers && !loadError) {
    return <LoadingScreen message="Loading Suppliers…" />
  }

  return (
    <section className="page-stack" aria-labelledby="suppliers-heading">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Purchasing master data</p>
          <h1 id="suppliers-heading">Suppliers</h1>
          <p>Manage the people and organizations your Company purchases from.</p>
        </div>
        {canManage ? (
          <Link className="button button--primary" to="/suppliers/new">
            Create Supplier
          </Link>
        ) : (
          <span className="read-only-badge">Read only</span>
        )}
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
      {actionError && (
        <div className="alert alert--error" role="alert">
          {actionError}
        </div>
      )}
      {successMessage && (
        <div className="alert alert--success" role="status">
          {successMessage}
        </div>
      )}

      {suppliers?.length === 0 && !loadError && (
        <div className="empty-state">
          <p className="card-label">No Suppliers</p>
          <h2>Your Supplier list is empty</h2>
          <p>
            {canManage
              ? 'Create your first Supplier to begin building purchasing master data.'
              : 'No Suppliers have been created yet. Your access is read-only.'}
          </p>
          {canManage && (
            <Link className="button button--primary" to="/suppliers/new">
              Create first Supplier
            </Link>
          )}
        </div>
      )}

      {suppliers && suppliers.length > 0 && !loadError && (
        <div className="table-card party-table-card">
          <div className="table-scroll">
            <table className="data-table party-table">
              <thead>
                <tr>
                  <th scope="col">Supplier</th>
                  <th scope="col">Contact person</th>
                  <th scope="col">Email</th>
                  <th scope="col">Phone</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td data-label="Supplier">
                      <Link
                        className="product-link"
                        to={`/suppliers/${supplier.id}`}
                      >
                        {supplier.name}
                      </Link>
                      {supplier.registrationNumber && (
                        <span className="table-secondary">
                          {supplier.registrationNumber}
                        </span>
                      )}
                    </td>
                    <td data-label="Contact person">
                      {supplier.contactPerson ?? '—'}
                    </td>
                    <td className="party-table__wrap" data-label="Email">
                      {supplier.email ?? '—'}
                    </td>
                    <td className="party-table__wrap" data-label="Phone">
                      {supplier.phone ?? '—'}
                    </td>
                    <td data-label="Status">
                      <LifecycleBadge isActive={supplier.isActive} />
                    </td>
                    <td data-label="Actions">
                      <div className="row-actions row-actions--compact party-table__actions">
                        <Link className="text-link" to={`/suppliers/${supplier.id}`}>
                          View
                        </Link>
                        {canManage && (
                          <>
                            <Link
                              className="text-link"
                              to={`/suppliers/${supplier.id}/edit`}
                            >
                              Edit
                            </Link>
                            <button
                              className={`text-button ${
                                supplier.isActive
                                  ? 'text-button--danger'
                                  : 'text-button--positive'
                              }`}
                              disabled={
                                pendingSupplierId !== null ||
                                lifecycleTarget !== null
                              }
                              onClick={() => setLifecycleTarget(supplier)}
                              type="button"
                            >
                              {supplier.isActive ? 'Archive' : 'Reactivate'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {lifecycleTarget && (
        <ConfirmationDialog
          confirmLabel={
            lifecycleTarget.isActive ? 'Archive Supplier' : 'Reactivate Supplier'
          }
          description={
            lifecycleTarget.isActive
              ? `“${lifecycleTarget.name}” will be archived but retained for historical records.`
              : `“${lifecycleTarget.name}” will become active again.`
          }
          isDestructive={lifecycleTarget.isActive}
          isPending={pendingSupplierId === lifecycleTarget.id}
          onCancel={() => setLifecycleTarget(null)}
          onConfirm={confirmLifecycleChange}
          pendingLabel={
            lifecycleTarget.isActive
              ? 'Archiving Supplier…'
              : 'Reactivating Supplier…'
          }
          title={
            lifecycleTarget.isActive ? 'Archive Supplier?' : 'Reactivate Supplier?'
          }
        />
      )}
    </section>
  )
}
