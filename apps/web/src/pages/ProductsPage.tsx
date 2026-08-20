import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import {
  archiveProduct,
  createInventoryAdjustment,
  getCategories,
  getInventoryMovements,
  getProduct,
  getProducts,
  updateProduct,
  type Category,
  type InventoryAdjustmentInput,
  type InventoryMovement,
  type Product,
  type ProductListFilters,
} from '../api/catalog'
import { ApiError } from '../api/client'
import { ConfirmationDialog } from '../components/ConfirmationDialog'
import { InventoryAdjustmentDialog } from '../components/InventoryAdjustmentDialog'
import { LifecycleBadge } from '../components/LifecycleBadge'
import { LoadingScreen } from '../components/LoadingScreen'
import { useAuth } from '../features/auth/auth-context'

function replaceProduct(products: Product[], next: Product): Product[] {
  return products.map((product) => (product.id === next.id ? next : product))
}

function getCategoryLabel(product: Product, categories: Category[]): string {
  if (!product.categoryId) return 'Uncategorized'
  const category = categories.find((item) => item.id === product.categoryId)
  if (!category) return 'Category unavailable'
  return `${category.name}${category.isActive ? '' : ' (Archived)'}`
}

function isLowStock(product: Product): boolean {
  if (!product.isActive) return false

  const quantity = product.quantityOnHand.match(/^(\d+)\.(\d{3})$/)
  const reorder = product.reorderLevel.match(/^(\d+)\.(\d{3})$/)
  if (!quantity || !reorder) return false

  return (
    BigInt(`${quantity[1]}${quantity[2]}`) <=
    BigInt(`${reorder[1]}${reorder[2]}`)
  )
}

type QuickAdjustment = {
  product: Product
  movements: InventoryMovement[]
}

export function ProductsPage() {
  const [products, setProducts] = useState<Product[] | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [categoriesLoaded, setCategoriesLoaded] = useState(false)
  const [productLoadError, setProductLoadError] = useState<string | null>(null)
  const [categoryLoadError, setCategoryLoadError] = useState<string | null>(null)
  const [productsLoading, setProductsLoading] = useState(true)
  const [searchDraft, setSearchDraft] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [lifecycleTarget, setLifecycleTarget] = useState<Product | null>(null)
  const [quickAdjustment, setQuickAdjustment] = useState<QuickAdjustment | null>(null)
  const [openingAdjustmentProductId, setOpeningAdjustmentProductId] = useState<string | null>(null)
  const [pendingProductId, setPendingProductId] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const { runAuthenticated, user } = useAuth()
  const lifecycleRequestRef = useRef(false)
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN'
  const filters: ProductListFilters = {
    ...(appliedSearch ? { search: appliedSearch } : {}),
    ...(lowStockOnly ? { lowStock: true as const } : {}),
  }
  const hasFilters = appliedSearch.length > 0 || lowStockOnly
  const loadError = productLoadError ?? categoryLoadError

  useEffect(() => {
    const controller = new AbortController()

    async function loadProducts() {
      setProductsLoading(true)
      setProductLoadError(null)

      try {
        const requestFilters: ProductListFilters = {
          ...(appliedSearch ? { search: appliedSearch } : {}),
          ...(lowStockOnly ? { lowStock: true } : {}),
        }
        const loadedProducts = await runAuthenticated((accessToken) =>
          getProducts(accessToken, requestFilters, controller.signal),
        )
        setProducts(loadedProducts)
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
        setProductLoadError(
          error instanceof ApiError
            ? error.message
            : 'Products could not be loaded. Please try again.',
        )
      } finally {
        if (!controller.signal.aborted) setProductsLoading(false)
      }
    }

    void loadProducts()
    return () => controller.abort()
  }, [appliedSearch, lowStockOnly, retryCount, runAuthenticated])

  useEffect(() => {
    const controller = new AbortController()

    async function loadCategories() {
      setCategoryLoadError(null)

      try {
        const loadedCategories = await runAuthenticated((accessToken) =>
          getCategories(accessToken, controller.signal),
        )
        setCategories(loadedCategories)
        setCategoriesLoaded(true)
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
        setCategoryLoadError(
          error instanceof ApiError
            ? error.message
            : 'Product Categories could not be loaded. Please try again.',
        )
      }
    }

    void loadCategories()
    return () => controller.abort()
  }, [retryCount, runAuthenticated])

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
    setLowStockOnly(false)
  }

  function requestLifecycleChange(product: Product) {
    if (
      !canManage ||
      pendingProductId ||
      lifecycleTarget ||
      quickAdjustment ||
      openingAdjustmentProductId
    ) return
    setLifecycleTarget(product)
  }

  async function openQuickAdjustment(product: Product) {
    if (
      !canManage ||
      !product.isActive ||
      lifecycleTarget ||
      pendingProductId ||
      quickAdjustment ||
      openingAdjustmentProductId
    ) return

    setOpeningAdjustmentProductId(product.id)
    setActionError(null)
    setSuccessMessage(null)

    try {
      const [refreshedProduct, movements] = await runAuthenticated(
        (accessToken) =>
          Promise.all([
            getProduct(accessToken, product.id),
            getInventoryMovements(accessToken, product.id),
          ]),
      )
      setProducts((current) => replaceProduct(current ?? [], refreshedProduct))

      if (!refreshedProduct.isActive) {
        setActionError('Archived Products cannot receive inventory adjustments.')
        return
      }

      setQuickAdjustment({ product: refreshedProduct, movements })
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setActionError('You do not have permission to adjust inventory.')
      } else {
        setActionError(
          error instanceof ApiError
            ? error.message
            : 'The inventory adjustment could not be opened. Please try again.',
        )
      }
    } finally {
      setOpeningAdjustmentProductId(null)
    }
  }

  async function submitInventoryAdjustment(input: InventoryAdjustmentInput) {
    const target = quickAdjustment?.product
    if (!target) return

    const result = await runAuthenticated((accessToken) =>
      createInventoryAdjustment(accessToken, target.id, input),
    )
    const updatedProduct = {
      ...target,
      quantityOnHand: result.product.quantityOnHand,
    }

    setProducts((current) => replaceProduct(current ?? [], updatedProduct))
    setQuickAdjustment(null)
    setActionError(null)
    setSuccessMessage(
      `Stock adjusted successfully for ${target.sku}. Current stock is ${result.product.quantityOnHand} ${target.unit}.`,
    )

    try {
      const refreshedProducts = await runAuthenticated((accessToken) =>
        getProducts(accessToken, filters),
      )
      setProducts(refreshedProducts)
    } catch {
      setActionError(
        'The adjustment was saved, but the latest Product list could not be reloaded.',
      )
    }
  }

  async function confirmLifecycleChange() {
    const product = lifecycleTarget
    if (!product || !canManage || pendingProductId || lifecycleRequestRef.current) return

    lifecycleRequestRef.current = true
    setPendingProductId(product.id)
    setActionError(null)
    setSuccessMessage(null)

    try {
      const updated = await runAuthenticated((accessToken) =>
        product.isActive
          ? archiveProduct(accessToken, product.id)
          : updateProduct(accessToken, product.id, { isActive: true }),
      )
      setProducts((current) =>
        lowStockOnly && !updated.isActive
          ? (current ?? []).filter((product) => product.id !== updated.id)
          : replaceProduct(current ?? [], updated),
      )
      setSuccessMessage(
        `Product ${updated.sku} ${updated.isActive ? 'reactivated' : 'archived'} successfully.`,
      )

      if (lowStockOnly) {
        try {
          const refreshedProducts = await runAuthenticated((accessToken) =>
            getProducts(accessToken, filters),
          )
          setProducts(refreshedProducts)
        } catch {
          setActionError(
            'The Product was updated, but the filtered list could not be reloaded.',
          )
        }
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setActionError('You do not have permission to manage Products.')
      } else {
        setActionError(
          error instanceof ApiError
            ? error.message
            : 'The Product could not be updated. Please try again.',
        )
      }
    } finally {
      lifecycleRequestRef.current = false
      setPendingProductId(null)
      setLifecycleTarget(null)
    }
  }

  if ((!products || !categoriesLoaded) && !loadError) {
    return <LoadingScreen message="Loading Products…" />
  }

  return (
    <section className="page-stack" aria-labelledby="products-heading">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Product catalog</p>
          <h1 id="products-heading">Products</h1>
          <p>Manage Product master data and view current stock balances.</p>
        </div>
        {canManage ? (
          <Link className="button button--primary" to="/products/new">
            Create Product
          </Link>
        ) : (
          <span className="read-only-badge">Read only</span>
        )}
      </div>

      {loadError && (
        <div className="alert alert--error" role="alert">
          <span>{loadError}</span>
          <button className="text-button" onClick={() => setRetryCount((value) => value + 1)}>
            Try again
          </button>
        </div>
      )}
      {actionError && <div className="alert alert--error" role="alert">{actionError}</div>}
      {successMessage && <div className="alert alert--success" role="status">{successMessage}</div>}

      <div className="product-filters" aria-label="Product search and filters">
        <form className="product-search" onSubmit={applySearch}>
          <label htmlFor="product-search">Search Products</label>
          <div className="product-search__controls">
            <input
              id="product-search"
              maxLength={200}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search by SKU or Product name"
              type="search"
              value={searchDraft}
            />
            <button className="button button--secondary" disabled={productsLoading} type="submit">
              Search
            </button>
            {(searchDraft || appliedSearch) && (
              <button className="text-button" onClick={clearSearch} type="button">
                Clear search
              </button>
            )}
          </div>
        </form>
        <label className="low-stock-filter">
          <input
            checked={lowStockOnly}
            disabled={productsLoading}
            onChange={(event) => setLowStockOnly(event.target.checked)}
            type="checkbox"
          />
          <span>
            <strong>Low stock only</strong>
            <small>Active Products at or below reorder level</small>
          </span>
        </label>
      </div>

      {productsLoading && products && (
        <p className="catalog-loading" role="status">Updating Products…</p>
      )}

      {products && products.length === 0 && !hasFilters && !productsLoading && !productLoadError && (
        <div className="empty-state">
          <p className="card-label">No Products</p>
          <h2>Your Product catalog is empty</h2>
          <p>
            {canManage
              ? 'Create the first Product. Its stock balance will begin at 0.000.'
              : 'No Products have been created yet. Your access is read-only.'}
          </p>
          {canManage && (
            <Link className="button button--primary" to="/products/new">Create first Product</Link>
          )}
        </div>
      )}

      {products && products.length === 0 && hasFilters && !productsLoading && !productLoadError && (
        <div className="empty-state">
          <p className="card-label">No matches</p>
          <h2>No Products match your current search or filter</h2>
          <p>Try a different SKU or Product name, or clear the active filters.</p>
          <button className="button button--secondary" onClick={clearAllFilters} type="button">
            Clear all filters
          </button>
        </div>
      )}

      {products && products.length > 0 && !productsLoading && !productLoadError && (
        <div className="table-card product-table-card">
          <div className="table-scroll">
            <table className="data-table product-table">
              <colgroup>
                <col className="product-table__product-column" />
                <col className="product-table__category-column" />
                <col className="product-table__money-column" />
                <col className="product-table__stock-column" />
                <col className="product-table__reorder-column" />
                <col className="product-table__status-column" />
                <col className="product-table__actions-column" />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">Product</th>
                  <th scope="col">Category</th>
                  <th scope="col">Selling price</th>
                  <th scope="col">Stock</th>
                  <th scope="col">Reorder level</th>
                  <th scope="col">Status</th>
                  <th scope="col">
                    <span className="product-table__actions-label">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td data-label="Product">
                      <div>
                        <Link className="product-link" to={`/products/${product.id}`}>{product.name}</Link>
                        <span className="table-secondary">{product.sku} · {product.unit}</span>
                      </div>
                    </td>
                    <td data-label="Category">{getCategoryLabel(product, categories)}</td>
                    <td data-label="Selling price">{product.sellingPrice}</td>
                    <td data-label="Stock">
                      <div className="product-stock">
                        <span><strong>{product.quantityOnHand}</strong> {product.unit}</span>
                        {isLowStock(product) && (
                          <span className="stock-status-badge">Low stock</span>
                        )}
                      </div>
                    </td>
                    <td data-label="Reorder level">{product.reorderLevel} {product.unit}</td>
                    <td data-label="Status"><LifecycleBadge isActive={product.isActive} /></td>
                    <td data-label="Actions">
                      <div className="row-actions row-actions--compact product-table__actions">
                        <Link className="text-link" to={`/products/${product.id}`}>View</Link>
                        {canManage && (
                          <>
                            <Link className="text-link" to={`/products/${product.id}/edit`}>Edit</Link>
                            {product.isActive && (
                              <button
                                className="text-button text-button--operation"
                                disabled={
                                  openingAdjustmentProductId !== null ||
                                  pendingProductId !== null ||
                                  lifecycleTarget !== null
                                }
                                onClick={() => void openQuickAdjustment(product)}
                                type="button"
                              >
                                {openingAdjustmentProductId === product.id
                                  ? 'Opening…'
                                  : 'Adjust Stock'}
                              </button>
                            )}
                            <button
                              className={`text-button ${product.isActive ? 'text-button--danger' : 'text-button--positive'}`}
                              disabled={
                                pendingProductId === product.id ||
                                lifecycleTarget !== null ||
                                openingAdjustmentProductId !== null ||
                                quickAdjustment !== null
                              }
                              onClick={() => requestLifecycleChange(product)}
                              type="button"
                            >
                              {pendingProductId === product.id
                                ? 'Updating…'
                                : product.isActive
                                  ? 'Archive'
                                  : 'Reactivate'}
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

      <aside className="notice-card">
        <strong>Stock is read only here</strong>
        <span>Use Adjust Stock to record a traceable inventory operation. Product editing cannot overwrite stock.</span>
      </aside>

      {lifecycleTarget && (
        <ConfirmationDialog
          confirmLabel={lifecycleTarget.isActive ? 'Archive Product' : 'Reactivate Product'}
          description={
            lifecycleTarget.isActive
              ? `Archive ${lifecycleTarget.name}? It will remain in Product history and can be reactivated later. Its ${lifecycleTarget.quantityOnHand} ${lifecycleTarget.unit} stock balance will not change, and its SKU will stay reserved.`
              : `Reactivate ${lifecycleTarget.name}? It will be available for normal Product use again.`
          }
          isDestructive={lifecycleTarget.isActive}
          isPending={pendingProductId === lifecycleTarget.id}
          onCancel={() => setLifecycleTarget(null)}
          onConfirm={confirmLifecycleChange}
          pendingLabel={lifecycleTarget.isActive ? 'Archiving Product…' : 'Reactivating Product…'}
          title={lifecycleTarget.isActive ? 'Archive Product?' : 'Reactivate Product?'}
        />
      )}

      {quickAdjustment && canManage && (
        <InventoryAdjustmentDialog
          onCancel={() => setQuickAdjustment(null)}
          onSubmit={submitInventoryAdjustment}
          openingBalanceAvailable={
            quickAdjustment.product.quantityOnHand === '0.000' &&
            quickAdjustment.movements.length === 0
          }
          product={quickAdjustment.product}
        />
      )}
    </section>
  )
}
