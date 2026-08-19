import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  createProduct,
  getCategories,
  getProduct,
  updateProduct,
  type Category,
  type Product,
  type ProductCreateInput,
  type ProductUpdateInput,
} from '../api/catalog'
import { ApiError } from '../api/client'
import { LoadingScreen } from '../components/LoadingScreen'
import { useAuth } from '../features/auth/auth-context'
import type { FormEvent } from 'react'

type ProductFormValues = {
  categoryId: string
  sku: string
  name: string
  description: string
  unit: string
  costPrice: string
  sellingPrice: string
  reorderLevel: string
}

type ProductField = keyof ProductFormValues
type FieldErrors = Partial<Record<ProductField, string>>

const productFields = new Set<ProductField>([
  'categoryId',
  'sku',
  'name',
  'description',
  'unit',
  'costPrice',
  'sellingPrice',
  'reorderLevel',
])
const moneyPattern = /^\d{1,10}(?:\.\d{1,2})?$/
const quantityPattern = /^\d{1,11}(?:\.\d{1,3})?$/

const emptyForm: ProductFormValues = {
  categoryId: '',
  sku: '',
  name: '',
  description: '',
  unit: '',
  costPrice: '',
  sellingPrice: '',
  reorderLevel: '',
}

function formFromProduct(product: Product): ProductFormValues {
  return {
    categoryId: product.categoryId ?? '',
    sku: product.sku,
    name: product.name,
    description: product.description ?? '',
    unit: product.unit,
    costPrice: product.costPrice,
    sellingPrice: product.sellingPrice,
    reorderLevel: product.reorderLevel,
  }
}

function validate(values: ProductFormValues, isEditing: boolean): FieldErrors {
  const errors: FieldErrors = {}
  if (!values.sku.trim()) errors.sku = 'SKU must not be blank.'
  if (!values.name.trim()) errors.name = 'Product name must not be blank.'
  if (!values.unit.trim()) errors.unit = 'Product unit must not be blank.'
  if (!moneyPattern.test(values.costPrice.trim())) {
    errors.costPrice = 'Enter a non-negative amount with at most 2 decimal places.'
  }
  if (!moneyPattern.test(values.sellingPrice.trim())) {
    errors.sellingPrice = 'Enter a non-negative amount with at most 2 decimal places.'
  }
  if (
    (isEditing || values.reorderLevel.trim() !== '') &&
    !quantityPattern.test(values.reorderLevel.trim())
  ) {
    errors.reorderLevel = 'Enter a non-negative quantity with at most 3 decimal places.'
  }
  return errors
}

function productFormError(error: unknown): {
  fieldErrors: FieldErrors
  formError: string
} {
  if (!(error instanceof ApiError)) {
    return {
      fieldErrors: {},
      formError: 'The Product could not be saved. Please try again.',
    }
  }
  if (error.status === 403) {
    return { fieldErrors: {}, formError: 'You do not have permission to manage Products.' }
  }
  if (error.code === 'SKU_ALREADY_EXISTS') {
    return {
      fieldErrors: { sku: 'This SKU is already used by an active or archived Product.' },
      formError: 'Choose a different SKU.',
    }
  }
  if (error.code === 'CATEGORY_UNAVAILABLE') {
    return {
      fieldErrors: { categoryId: 'This Category is archived or no longer available.' },
      formError: 'Choose an active Category or Uncategorized.',
    }
  }
  if (error.code === 'VALIDATION_ERROR') {
    const fieldErrors: FieldErrors = {}
    for (const detail of error.details) {
      if (productFields.has(detail.field as ProductField)) {
        fieldErrors[detail.field as ProductField] = detail.message
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

function createInput(values: ProductFormValues): ProductCreateInput {
  const reorderLevel = values.reorderLevel.trim()
  return {
    categoryId: values.categoryId || null,
    sku: values.sku.trim(),
    name: values.name.trim(),
    description: values.description.trim() || null,
    unit: values.unit.trim(),
    costPrice: values.costPrice.trim(),
    sellingPrice: values.sellingPrice.trim(),
    ...(reorderLevel ? { reorderLevel } : {}),
  }
}

function updateInput(product: Product, values: ProductFormValues): ProductUpdateInput {
  const input: ProductUpdateInput = {}
  const categoryId = values.categoryId || null
  const sku = values.sku.trim()
  const name = values.name.trim()
  const description = values.description.trim() || null
  const unit = values.unit.trim()
  const costPrice = values.costPrice.trim()
  const sellingPrice = values.sellingPrice.trim()
  const reorderLevel = values.reorderLevel.trim()

  if (categoryId !== product.categoryId) input.categoryId = categoryId
  if (sku !== product.sku) input.sku = sku
  if (name !== product.name) input.name = name
  if (description !== product.description) input.description = description
  if (unit !== product.unit) input.unit = unit
  if (costPrice !== product.costPrice) input.costPrice = costPrice
  if (sellingPrice !== product.sellingPrice) input.sellingPrice = sellingPrice
  if (reorderLevel !== product.reorderLevel) input.reorderLevel = reorderLevel

  return input
}

export function ProductFormPage() {
  const { productId } = useParams()
  const isEditing = Boolean(productId)
  const [product, setProduct] = useState<Product | null>(null)
  const [categories, setCategories] = useState<Category[] | null>(null)
  const [formValues, setFormValues] = useState<ProductFormValues>(emptyForm)
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
    if (!canManage) return
    const controller = new AbortController()

    async function loadForm() {
      setCategories(null)
      setLoadError(null)
      setNotFound(false)

      try {
        if (isEditing && productId) {
          const [loadedProduct, loadedCategories] = await runAuthenticated(
            (accessToken) =>
              Promise.all([
                getProduct(accessToken, productId, controller.signal),
                getCategories(accessToken, controller.signal),
              ]),
          )
          setProduct(loadedProduct)
          setFormValues(formFromProduct(loadedProduct))
          setCategories(loadedCategories)
        } else {
          const loadedCategories = await runAuthenticated((accessToken) =>
            getCategories(accessToken, controller.signal),
          )
          setCategories(loadedCategories)
          setFormValues(emptyForm)
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
        if (error instanceof ApiError && error.status === 404) {
          setNotFound(true)
        } else {
          setLoadError(
            error instanceof ApiError
              ? error.message
              : 'The Product form could not be loaded. Please try again.',
          )
        }
      }
    }

    void loadForm()
    return () => controller.abort()
  }, [canManage, isEditing, productId, retryCount, runAuthenticated])

  function updateField(field: ProductField, value: string) {
    setFormValues((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
    setFormError(null)
  }

  async function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canManage || isSubmitting || (isEditing && !product)) return

    const validationErrors = validate(formValues, isEditing)
    setFieldErrors(validationErrors)
    setFormError(null)
    if (Object.keys(validationErrors).length > 0) {
      setFormError('Review the highlighted fields and try again.')
      return
    }

    setIsSubmitting(true)
    try {
      const saved = await runAuthenticated((accessToken) =>
        isEditing && product
          ? updateProduct(accessToken, product.id, updateInput(product, formValues))
          : createProduct(accessToken, createInput(formValues)),
      )
      navigate(`/products/${saved.id}`, {
        replace: true,
        state: {
          successMessage: `Product ${saved.sku} ${isEditing ? 'updated' : 'created'} successfully.`,
        },
      })
    } catch (error) {
      const result = productFormError(error)
      setFieldErrors(result.fieldErrors)
      setFormError(result.formError)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!canManage) {
    return (
      <section className="empty-state" aria-labelledby="product-form-forbidden">
        <p className="card-label">Read-only access</p>
        <h1 id="product-form-forbidden">Product management unavailable</h1>
        <p>Your STAFF role can view Products but cannot create or edit them.</p>
        <Link className="button button--secondary" to="/products">Back to Products</Link>
      </section>
    )
  }

  if (!categories && !loadError && !notFound) {
    return <LoadingScreen message={isEditing ? 'Loading Product form…' : 'Loading Categories…'} />
  }

  if (notFound) {
    return (
      <section className="empty-state" aria-labelledby="edit-product-not-found">
        <p className="card-label">Product unavailable</p>
        <h1 id="edit-product-not-found">Product not found</h1>
        <p>This Product does not exist or is unavailable to your Company.</p>
        <Link className="button button--secondary" to="/products">Back to Products</Link>
      </section>
    )
  }

  const activeCategories = categories?.filter((category) => category.isActive) ?? []
  const currentCategory =
    isEditing && product?.categoryId
      ? categories?.find((category) => category.id === product.categoryId)
      : undefined
  const inactiveCurrentCategory = currentCategory && !currentCategory.isActive

  return (
    <section className="page-stack" aria-labelledby="product-form-heading">
      <div className="breadcrumb-row"><Link to={product ? `/products/${product.id}` : '/products'}>← {product ? 'Product details' : 'Products'}</Link></div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Product catalog</p>
          <h1 id="product-form-heading">{isEditing ? 'Edit Product' : 'Create Product'}</h1>
          <p>{isEditing ? 'Update master data without changing stock.' : 'Add master data. New Product stock always begins at 0.000.'}</p>
        </div>
      </div>

      {loadError && (
        <div className="alert alert--error" role="alert">
          <span>{loadError}</span>
          <button className="text-button" onClick={() => setRetryCount((value) => value + 1)}>Try again</button>
        </div>
      )}

      {categories && (
        <form className="management-card product-form" noValidate onSubmit={submitProduct}>
          {formError && <div className="alert alert--error" role="alert">{formError}</div>}

          <div className="form-section">
            <div className="form-section__heading">
              <h2>Identity and organization</h2>
              <p>SKU is normalized to uppercase by the backend.</p>
            </div>
            <div className="product-form__grid">
              <label className="field">
                <span>SKU</span>
                <input aria-label="SKU" aria-describedby={fieldErrors.sku ? 'sku-error' : undefined} aria-invalid={fieldErrors.sku ? 'true' : undefined} disabled={isSubmitting} maxLength={100} name="sku" onChange={(event) => updateField('sku', event.target.value)} required value={formValues.sku} />
                {fieldErrors.sku && <small className="field-error" id="sku-error">{fieldErrors.sku}</small>}
              </label>
              <label className="field">
                <span>Product name</span>
                <input aria-label="Product name" aria-describedby={fieldErrors.name ? 'product-name-error' : undefined} aria-invalid={fieldErrors.name ? 'true' : undefined} disabled={isSubmitting} maxLength={200} name="name" onChange={(event) => updateField('name', event.target.value)} required value={formValues.name} />
                {fieldErrors.name && <small className="field-error" id="product-name-error">{fieldErrors.name}</small>}
              </label>
              <label className="field">
                <span>Category <span className="optional-label">Optional</span></span>
                <div className="select-control">
                  <select aria-label="Category" aria-describedby={fieldErrors.categoryId ? 'category-error' : 'category-help'} aria-invalid={fieldErrors.categoryId ? 'true' : undefined} className="product-category-select" disabled={isSubmitting} name="categoryId" onChange={(event) => updateField('categoryId', event.target.value)} value={formValues.categoryId}>
                    <option value="">Uncategorized</option>
                    {inactiveCurrentCategory && (
                      <option disabled value={currentCategory.id}>{currentCategory.name} (Archived — current)</option>
                    )}
                    {activeCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                  </select>
                  <svg aria-hidden="true" viewBox="0 0 20 20">
                    <path d="m6 8 4 4 4-4" />
                  </svg>
                </div>
                {fieldErrors.categoryId ? <small className="field-error" id="category-error">{fieldErrors.categoryId}</small> : <small className="field-help" id="category-help">{activeCategories.length === 0 ? 'No active Categories are available. Uncategorized remains valid.' : 'Only active Categories can be newly assigned.'}</small>}
              </label>
              <label className="field">
                <span>Unit</span>
                <input aria-label="Unit" aria-describedby={fieldErrors.unit ? 'unit-error' : 'unit-help'} aria-invalid={fieldErrors.unit ? 'true' : undefined} disabled={isSubmitting} maxLength={50} name="unit" onChange={(event) => updateField('unit', event.target.value)} placeholder="pcs, box, kg" required value={formValues.unit} />
                {fieldErrors.unit ? <small className="field-error" id="unit-error">{fieldErrors.unit}</small> : <small className="field-help" id="unit-help">Use a simple business unit such as pcs, box, or kg.</small>}
              </label>
              <label className="field product-form__wide">
                <span>Description <span className="optional-label">Optional</span></span>
                <textarea aria-label="Description" disabled={isSubmitting} maxLength={2000} name="description" onChange={(event) => updateField('description', event.target.value)} rows={4} value={formValues.description} />
              </label>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section__heading">
              <h2>Pricing and planning</h2>
              <p>Exact decimal strings are sent to the API; no floating-point calculations are performed.</p>
            </div>
            <div className="product-form__grid product-form__grid--three">
              <label className="field">
                <span>Cost price</span>
                <input aria-label="Cost price" aria-describedby={fieldErrors.costPrice ? 'cost-price-error' : 'cost-price-help'} aria-invalid={fieldErrors.costPrice ? 'true' : undefined} disabled={isSubmitting} inputMode="decimal" name="costPrice" onChange={(event) => updateField('costPrice', event.target.value)} placeholder="0.00" required value={formValues.costPrice} />
                {fieldErrors.costPrice ? <small className="field-error" id="cost-price-error">{fieldErrors.costPrice}</small> : <small className="field-help" id="cost-price-help">Maximum 2 decimal places.</small>}
              </label>
              <label className="field">
                <span>Selling price</span>
                <input aria-label="Selling price" aria-describedby={fieldErrors.sellingPrice ? 'selling-price-error' : 'selling-price-help'} aria-invalid={fieldErrors.sellingPrice ? 'true' : undefined} disabled={isSubmitting} inputMode="decimal" name="sellingPrice" onChange={(event) => updateField('sellingPrice', event.target.value)} placeholder="0.00" required value={formValues.sellingPrice} />
                {fieldErrors.sellingPrice ? <small className="field-error" id="selling-price-error">{fieldErrors.sellingPrice}</small> : <small className="field-help" id="selling-price-help">Maximum 2 decimal places.</small>}
              </label>
              <label className="field">
                <span>Reorder level {!isEditing && <span className="optional-label">Optional</span>}</span>
                <input aria-label="Reorder level" aria-describedby={fieldErrors.reorderLevel ? 'reorder-level-error' : 'reorder-level-help'} aria-invalid={fieldErrors.reorderLevel ? 'true' : undefined} disabled={isSubmitting} inputMode="decimal" name="reorderLevel" onChange={(event) => updateField('reorderLevel', event.target.value)} placeholder="0.000" value={formValues.reorderLevel} />
                {fieldErrors.reorderLevel ? <small className="field-error" id="reorder-level-error">{fieldErrors.reorderLevel}</small> : <small className="field-help" id="reorder-level-help">Maximum 3 decimal places.</small>}
              </label>
            </div>
          </div>

          {product && (
            <aside className="stock-readout" aria-label="Read-only stock balance">
              <span>Quantity on hand</span>
              <strong>{product.quantityOnHand} {product.unit}</strong>
              <small>Stock cannot be changed through Product master data.</small>
            </aside>
          )}

          <div className="form-actions">
            <Link className="button button--secondary" to={product ? `/products/${product.id}` : '/products'}>Cancel</Link>
            <button className="button button--primary" disabled={isSubmitting} type="submit">{isSubmitting ? 'Saving Product…' : isEditing ? 'Save changes' : 'Create Product'}</button>
          </div>
        </form>
      )}
    </section>
  )
}
