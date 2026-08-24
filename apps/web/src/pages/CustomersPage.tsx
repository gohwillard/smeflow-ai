import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import {
  archiveCustomer,
  getCustomers,
  updateCustomer,
  type Customer,
  type CustomerListFilters,
  type PartnerLifecycleStatus,
} from '../api/partners'
import { ApiError } from '../api/client'
import { ConfirmationDialog } from '../components/ConfirmationDialog'
import { LifecycleBadge } from '../components/LifecycleBadge'
import { LoadingScreen } from '../components/LoadingScreen'
import { StatusFilter } from '../components/StatusFilter'
import { useAuth } from '../features/auth/auth-context'

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [lifecycleTarget, setLifecycleTarget] = useState<Customer | null>(null)
  const [pendingCustomerId, setPendingCustomerId] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [customersLoading, setCustomersLoading] = useState(true)
  const [searchDraft, setSearchDraft] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<PartnerLifecycleStatus | ''>('')
  const lifecycleRequestRef = useRef(false)
  const { runAuthenticated, user } = useAuth()
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN'
  const filters: CustomerListFilters = {
    ...(appliedSearch ? { search: appliedSearch } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
  }
  const hasFilters = appliedSearch.length > 0 || statusFilter !== ''

  useEffect(() => {
    const controller = new AbortController()

    async function loadCustomers() {
      setCustomersLoading(true)
      setLoadError(null)
      try {
        setCustomers(
          await runAuthenticated((accessToken) =>
            getCustomers(
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
            : 'Customers could not be loaded. Please try again.',
        )
      } finally {
        if (!controller.signal.aborted) setCustomersLoading(false)
      }
    }

    void loadCustomers()
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
    const customer = lifecycleTarget
    if (
      !customer ||
      !canManage ||
      pendingCustomerId ||
      lifecycleRequestRef.current
    ) {
      return
    }

    lifecycleRequestRef.current = true
    setPendingCustomerId(customer.id)
    setActionError(null)
    setSuccessMessage(null)

    try {
      const updated = await runAuthenticated((accessToken) =>
        customer.isActive
          ? archiveCustomer(accessToken, customer.id)
          : updateCustomer(accessToken, customer.id, { isActive: true }),
      )
      setSuccessMessage(
        `Customer ${updated.name} ${updated.isActive ? 'reactivated' : 'archived'} successfully.`,
      )

      try {
        const refreshedCustomers = await runAuthenticated((accessToken) =>
          getCustomers(accessToken, filters),
        )
        setCustomers(refreshedCustomers)
      } catch {
        setActionError(
          'The Customer was updated, but the filtered list could not be reloaded.',
        )
      }
    } catch (error) {
      setActionError(
        error instanceof ApiError && error.status === 403
          ? 'You do not have permission to manage Customers.'
          : error instanceof ApiError
            ? error.message
            : 'The Customer could not be updated. Please try again.',
      )
    } finally {
      lifecycleRequestRef.current = false
      setPendingCustomerId(null)
      setLifecycleTarget(null)
    }
  }

  if (!customers && !loadError) {
    return <LoadingScreen message="Loading Customers…" />
  }

  return (
    <section className="page-stack" aria-labelledby="customers-heading">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Sales master data</p>
          <h1 id="customers-heading">Customers</h1>
          <p>Manage the people and organizations your Company sells to.</p>
        </div>
        {canManage ? (
          <Link className="button button--primary" to="/customers/new">
            Create Customer
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

      <div className="party-filters" aria-label="Customer search and filters">
        <form className="party-search" onSubmit={applySearch}>
          <label htmlFor="customer-search">Search Customers</label>
          <div className="party-search__controls">
            <input
              id="customer-search"
              maxLength={320}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search by name, registration number, contact person, email, or phone"
              type="search"
              value={searchDraft}
            />
            <button
              className="button button--secondary"
              disabled={customersLoading}
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
        <StatusFilter
          disabled={customersLoading}
          onChange={setStatusFilter}
          value={statusFilter}
        />
      </div>

      {customersLoading && customers && (
        <p className="catalog-loading" role="status">Updating Customers…</p>
      )}

      {customers?.length === 0 && !hasFilters && !customersLoading && !loadError && (
        <div className="empty-state">
          <p className="card-label">No Customers</p>
          <h2>Your Customer list is empty</h2>
          <p>
            {canManage
              ? 'Create your first Customer to begin building sales master data.'
              : 'No Customers have been created yet. Your access is read-only.'}
          </p>
          {canManage && (
            <Link className="button button--primary" to="/customers/new">
              Create first Customer
            </Link>
          )}
        </div>
      )}

      {customers?.length === 0 && hasFilters && !customersLoading && !loadError && (
        <div className="empty-state">
          <p className="card-label">No matches</p>
          <h2>No Customers match your current search or filter</h2>
          <p>Try different Customer details, or clear the active filters.</p>
          <button className="button button--secondary" onClick={clearAllFilters} type="button">
            Clear all filters
          </button>
        </div>
      )}

      {customers && customers.length > 0 && !customersLoading && !loadError && (
        <div className="table-card party-table-card">
          <div className="table-scroll">
            <table className="data-table party-table">
              <thead>
                <tr>
                  <th scope="col">Customer</th>
                  <th scope="col">Contact person</th>
                  <th scope="col">Email</th>
                  <th scope="col">Phone</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td data-label="Customer">
                      <Link
                        className="product-link"
                        to={`/customers/${customer.id}`}
                      >
                        {customer.name}
                      </Link>
                      {customer.registrationNumber && (
                        <span className="table-secondary">
                          {customer.registrationNumber}
                        </span>
                      )}
                    </td>
                    <td data-label="Contact person">
                      {customer.contactPerson ?? '—'}
                    </td>
                    <td className="party-table__wrap" data-label="Email">
                      {customer.email ?? '—'}
                    </td>
                    <td className="party-table__wrap" data-label="Phone">
                      {customer.phone ?? '—'}
                    </td>
                    <td data-label="Status">
                      <LifecycleBadge isActive={customer.isActive} />
                    </td>
                    <td data-label="Actions">
                      <div className="row-actions row-actions--compact party-table__actions">
                        <Link className="text-link" to={`/customers/${customer.id}`}>
                          View
                        </Link>
                        {canManage && (
                          <>
                            <Link
                              className="text-link"
                              to={`/customers/${customer.id}/edit`}
                            >
                              Edit
                            </Link>
                            <button
                              className={`text-button ${
                                customer.isActive
                                  ? 'text-button--danger'
                                  : 'text-button--positive'
                              }`}
                              disabled={
                                pendingCustomerId !== null ||
                                lifecycleTarget !== null
                              }
                              onClick={() => setLifecycleTarget(customer)}
                              type="button"
                            >
                              {customer.isActive ? 'Archive' : 'Reactivate'}
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
            lifecycleTarget.isActive ? 'Archive Customer' : 'Reactivate Customer'
          }
          description={
            lifecycleTarget.isActive
              ? `“${lifecycleTarget.name}” will be archived but retained for historical records.`
              : `“${lifecycleTarget.name}” will become active again.`
          }
          isDestructive={lifecycleTarget.isActive}
          isPending={pendingCustomerId === lifecycleTarget.id}
          onCancel={() => setLifecycleTarget(null)}
          onConfirm={confirmLifecycleChange}
          pendingLabel={
            lifecycleTarget.isActive
              ? 'Archiving Customer…'
              : 'Reactivating Customer…'
          }
          title={
            lifecycleTarget.isActive ? 'Archive Customer?' : 'Reactivate Customer?'
          }
        />
      )}
    </section>
  )
}
