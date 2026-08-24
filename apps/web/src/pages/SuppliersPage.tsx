import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { ApiError } from '../api/client'
import {
  archiveSupplier,
  getSuppliers,
  updateSupplier,
  type PartnerLifecycleStatus,
  type Supplier,
  type SupplierListFilters,
} from '../api/partners'
import { ConfirmationDialog } from '../components/ConfirmationDialog'
import { LifecycleBadge } from '../components/LifecycleBadge'
import { LoadingScreen } from '../components/LoadingScreen'
import { useAuth } from '../features/auth/auth-context'

export function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [lifecycleTarget, setLifecycleTarget] = useState<Supplier | null>(null)
  const [pendingSupplierId, setPendingSupplierId] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [suppliersLoading, setSuppliersLoading] = useState(true)
  const [searchDraft, setSearchDraft] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<PartnerLifecycleStatus | ''>('')
  const lifecycleRequestRef = useRef(false)
  const { runAuthenticated, user } = useAuth()
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN'
  const filters: SupplierListFilters = {
    ...(appliedSearch ? { search: appliedSearch } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
  }
  const hasFilters = appliedSearch.length > 0 || statusFilter !== ''

  useEffect(() => {
    const controller = new AbortController()

    async function loadSuppliers() {
      setSuppliersLoading(true)
      setLoadError(null)
      try {
        setSuppliers(
          await runAuthenticated((accessToken) =>
            getSuppliers(
              accessToken,
              {
                ...(appliedSearch ? { search: appliedSearch } : {}),
                ...(statusFilter ? { status: statusFilter } : {}),
              },
              controller.signal,
            ),
          ),
        )
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
        setLoadError(
          error instanceof ApiError
            ? error.message
            : 'Suppliers could not be loaded. Please try again.',
        )
      } finally {
        if (!controller.signal.aborted) setSuppliersLoading(false)
      }
    }

    void loadSuppliers()
    return () => controller.abort()
  }, [appliedSearch, retryCount, runAuthenticated, statusFilter])

  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedSearch = searchDraft.trim()
    setSearchDraft(normalizedSearch)
    setAppliedSearch(normalizedSearch)
  }

  function clearSearch() {
    setSearchDraft('')
    setAppliedSearch('')
  }

  function clearAllFilters() {
    setSearchDraft('')
    setAppliedSearch('')
    setStatusFilter('')
  }

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
      setSuccessMessage(
        `Supplier ${updated.name} ${updated.isActive ? 'reactivated' : 'archived'} successfully.`,
      )

      try {
        const refreshedSuppliers = await runAuthenticated((accessToken) =>
          getSuppliers(accessToken, filters),
        )
        setSuppliers(refreshedSuppliers)
      } catch {
        setActionError(
          'The Supplier was updated, but the filtered list could not be reloaded.',
        )
      }
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

      <div className="party-filters" aria-label="Supplier search and filters">
        <form className="party-search" onSubmit={applySearch}>
          <label htmlFor="supplier-search">Search Suppliers</label>
          <div className="party-search__controls">
            <input
              id="supplier-search"
              maxLength={320}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search by name, registration number, contact person, email, or phone"
              type="search"
              value={searchDraft}
            />
            <button
              className="button button--secondary"
              disabled={suppliersLoading}
              type="submit"
            >
              Search
            </button>
            {(searchDraft || appliedSearch) && (
              <button className="text-button" onClick={clearSearch} type="button">
                Clear search
              </button>
            )}
          </div>
        </form>
        <label className="party-status-filter" htmlFor="supplier-status-filter">
          Lifecycle status
          <select
            disabled={suppliersLoading}
            id="supplier-status-filter"
            onChange={(event) =>
              setStatusFilter(event.target.value as PartnerLifecycleStatus | '')
            }
            value={statusFilter}
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </label>
      </div>

      {suppliersLoading && suppliers && (
        <p className="catalog-loading" role="status">Updating Suppliers…</p>
      )}

      {suppliers?.length === 0 && !hasFilters && !suppliersLoading && !loadError && (
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

      {suppliers?.length === 0 && hasFilters && !suppliersLoading && !loadError && (
        <div className="empty-state">
          <p className="card-label">No matches</p>
          <h2>No Suppliers match your current search or filter</h2>
          <p>Try different Supplier details, or clear the active filters.</p>
          <button className="button button--secondary" onClick={clearAllFilters} type="button">
            Clear all filters
          </button>
        </div>
      )}

      {suppliers && suppliers.length > 0 && !suppliersLoading && !loadError && (
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
