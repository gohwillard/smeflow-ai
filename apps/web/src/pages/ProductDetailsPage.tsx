import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import {
  archiveProduct,
  getCategories,
  getProduct,
  updateProduct,
  type Category,
  type Product,
} from '../api/catalog'
import { ApiError } from '../api/client'
import { ConfirmationDialog } from '../components/ConfirmationDialog'
import { LifecycleBadge } from '../components/LifecycleBadge'
import { LoadingScreen } from '../components/LoadingScreen'
import { useAuth } from '../features/auth/auth-context'

type ProductLocationState = {
  successMessage?: string
}

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function categoryDisplay(product: Product, categories: Category[]): string {
  if (!product.categoryId) return 'Uncategorized'
  const category = categories.find((item) => item.id === product.categoryId)
  if (!category) return 'Category unavailable'
  return `${category.name}${category.isActive ? '' : ' (Archived)'}`
}

export function ProductDetailsPage() {
  const { productId = '' } = useParams()
  const location = useLocation()
  const locationState = location.state as ProductLocationState | null
  const [product, setProduct] = useState<Product | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(
    locationState?.successMessage ?? null,
  )
  const [isUpdatingLifecycle, setIsUpdatingLifecycle] = useState(false)
  const [isLifecycleDialogOpen, setIsLifecycleDialogOpen] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const { runAuthenticated, user } = useAuth()
  const lifecycleRequestRef = useRef(false)
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN'

  useEffect(() => {
    const controller = new AbortController()

    async function loadDetails() {
      setProduct(null)
      setLoadError(null)
      setNotFound(false)

      try {
        const [loadedProduct, loadedCategories] = await runAuthenticated(
          (accessToken) =>
            Promise.all([
              getProduct(accessToken, productId, controller.signal),
              getCategories(accessToken, controller.signal),
            ]),
        )
        setProduct(loadedProduct)
        setCategories(loadedCategories)
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
        if (error instanceof ApiError && error.status === 404) {
          setNotFound(true)
        } else {
          setLoadError(
            error instanceof ApiError
              ? error.message
              : 'Product details could not be loaded. Please try again.',
          )
        }
      }
    }

    void loadDetails()
    return () => controller.abort()
  }, [productId, retryCount, runAuthenticated])

  async function changeLifecycle() {
    if (!product || !canManage || isUpdatingLifecycle || lifecycleRequestRef.current) return

    lifecycleRequestRef.current = true
    setIsUpdatingLifecycle(true)
    setActionError(null)
    setSuccessMessage(null)

    try {
      const updated = await runAuthenticated((accessToken) =>
        product.isActive
          ? archiveProduct(accessToken, product.id)
          : updateProduct(accessToken, product.id, { isActive: true }),
      )
      setProduct(updated)
      setSuccessMessage(
        `Product ${updated.sku} ${updated.isActive ? 'reactivated' : 'archived'} successfully.`,
      )
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setActionError('You do not have permission to manage Products.')
      } else if (error instanceof ApiError && error.status === 404) {
        setNotFound(true)
        setProduct(null)
      } else {
        setActionError(
          error instanceof ApiError
            ? error.message
            : 'The Product could not be updated. Please try again.',
        )
      }
    } finally {
      lifecycleRequestRef.current = false
      setIsUpdatingLifecycle(false)
      setIsLifecycleDialogOpen(false)
    }
  }

  if (!product && !loadError && !notFound) {
    return <LoadingScreen message="Loading Product details…" />
  }

  if (notFound) {
    return (
      <section className="empty-state" aria-labelledby="product-not-found">
        <p className="card-label">Product unavailable</p>
        <h1 id="product-not-found">Product not found</h1>
        <p>This Product does not exist or is unavailable to your Company.</p>
        <Link className="button button--secondary" to="/products">Back to Products</Link>
      </section>
    )
  }

  return (
    <section className="page-stack" aria-labelledby="product-details-heading">
      <div className="breadcrumb-row">
        <Link to="/products">← Products</Link>
      </div>

      {loadError && (
        <div className="alert alert--error" role="alert">
          <span>{loadError}</span>
          <button className="text-button" onClick={() => setRetryCount((value) => value + 1)}>Try again</button>
        </div>
      )}

      {product && (
        <>
          <div className="page-heading">
            <div>
              <div className="title-with-status">
                <p className="eyebrow">{product.sku}</p>
                <LifecycleBadge isActive={product.isActive} />
              </div>
              <h1 id="product-details-heading">{product.name}</h1>
              <p>{product.description ?? 'No description provided.'}</p>
            </div>
            {canManage ? (
              <div className="row-actions">
                <Link className="button button--secondary" to={`/products/${product.id}/edit`}>Edit Product</Link>
                <button
                  className={`button ${product.isActive ? 'button--danger' : 'button--primary'}`}
                  disabled={isUpdatingLifecycle || isLifecycleDialogOpen}
                  onClick={() => setIsLifecycleDialogOpen(true)}
                  type="button"
                >
                  {isUpdatingLifecycle
                    ? 'Updating…'
                    : product.isActive
                      ? 'Archive Product'
                      : 'Reactivate Product'}
                </button>
              </div>
            ) : (
              <span className="read-only-badge">Read only</span>
            )}
          </div>

          {successMessage && <div className="alert alert--success" role="status">{successMessage}</div>}
          {actionError && <div className="alert alert--error" role="alert">{actionError}</div>}

          <article className="management-card">
            <dl className="detail-grid">
              <div><dt>SKU</dt><dd>{product.sku}</dd></div>
              <div><dt>Category</dt><dd>{categoryDisplay(product, categories)}</dd></div>
              <div><dt>Unit</dt><dd>{product.unit}</dd></div>
              <div><dt>Status</dt><dd><LifecycleBadge isActive={product.isActive} /></dd></div>
              <div><dt>Cost price</dt><dd>{product.costPrice}</dd></div>
              <div><dt>Selling price</dt><dd>{product.sellingPrice}</dd></div>
              <div><dt>Quantity on hand</dt><dd><strong>{product.quantityOnHand}</strong> {product.unit}</dd></div>
              <div><dt>Reorder level</dt><dd>{product.reorderLevel} {product.unit}</dd></div>
              <div><dt>Created</dt><dd>{formatDate(product.createdAt)}</dd></div>
              <div><dt>Last updated</dt><dd>{formatDate(product.updatedAt)}</dd></div>
              <div className="detail-grid__wide"><dt>Description</dt><dd>{product.description ?? 'Not provided'}</dd></div>
            </dl>
          </article>

          <aside className="notice-card">
            <strong>Current stock is read only</strong>
            <span>Stock changes are deliberately excluded from Product editing and require traceable inventory operations.</span>
          </aside>

          {isLifecycleDialogOpen && (
            <ConfirmationDialog
              confirmLabel={product.isActive ? 'Archive Product' : 'Reactivate Product'}
              description={
                product.isActive
                  ? `Archive ${product.name}? It will remain in Product history and can be reactivated later. Its ${product.quantityOnHand} ${product.unit} stock balance will not change, and its SKU will stay reserved.`
                  : `Reactivate ${product.name}? It will be available for normal Product use again.`
              }
              isDestructive={product.isActive}
              isPending={isUpdatingLifecycle}
              onCancel={() => setIsLifecycleDialogOpen(false)}
              onConfirm={changeLifecycle}
              pendingLabel={product.isActive ? 'Archiving Product…' : 'Reactivating Product…'}
              title={product.isActive ? 'Archive Product?' : 'Reactivate Product?'}
            />
          )}
        </>
      )}
    </section>
  )
}
