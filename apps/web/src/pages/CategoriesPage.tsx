import { useEffect, useRef, useState } from 'react'
import {
  archiveCategory,
  createCategory,
  getCategories,
  updateCategory,
  type Category,
} from '../api/catalog'
import { ApiError } from '../api/client'
import { ConfirmationDialog } from '../components/ConfirmationDialog'
import { LifecycleBadge } from '../components/LifecycleBadge'
import { LoadingScreen } from '../components/LoadingScreen'
import { useAuth } from '../features/auth/auth-context'
import type { FormEvent } from 'react'

type CategoryFormValues = {
  name: string
  description: string
}

type CategoryField = keyof CategoryFormValues
type FieldErrors = Partial<Record<CategoryField, string>>

const emptyForm: CategoryFormValues = { name: '', description: '' }
const categoryFields = new Set<CategoryField>(['name', 'description'])

function categoryError(error: unknown): {
  fieldErrors: FieldErrors
  formError: string
} {
  if (!(error instanceof ApiError)) {
    return {
      fieldErrors: {},
      formError: 'The Category could not be saved. Please try again.',
    }
  }

  if (error.status === 403) {
    return {
      fieldErrors: {},
      formError: 'You do not have permission to manage Categories.',
    }
  }

  if (error.code === 'CATEGORY_ALREADY_EXISTS') {
    return {
      fieldErrors: {
        name: 'A Category with this name already exists, including archived Categories.',
      },
      formError: 'Choose a different Category name.',
    }
  }

  if (error.code === 'VALIDATION_ERROR') {
    const fieldErrors: FieldErrors = {}
    for (const detail of error.details) {
      if (categoryFields.has(detail.field as CategoryField)) {
        fieldErrors[detail.field as CategoryField] = detail.message
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

function replaceCategory(categories: Category[], next: Category): Category[] {
  return categories.map((category) =>
    category.id === next.id ? next : category,
  )
}

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formValues, setFormValues] = useState<CategoryFormValues>(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lifecycleTarget, setLifecycleTarget] = useState<Category | null>(null)
  const [pendingLifecycleId, setPendingLifecycleId] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const { runAuthenticated, user } = useAuth()
  const lifecycleRequestRef = useRef(false)
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN'

  useEffect(() => {
    const controller = new AbortController()

    async function loadCategories() {
      setLoadError(null)
      setCategories(null)

      try {
        const result = await runAuthenticated((accessToken) =>
          getCategories(accessToken, controller.signal),
        )
        setCategories(result)
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
        setLoadError(
          error instanceof ApiError
            ? error.message
            : 'Categories could not be loaded. Please try again.',
        )
      }
    }

    void loadCategories()
    return () => controller.abort()
  }, [retryCount, runAuthenticated])

  function openCreateForm() {
    if (!canManage) return
    setEditingId(null)
    setFormValues(emptyForm)
    setFieldErrors({})
    setFormError(null)
    setSuccessMessage(null)
    setIsCreating(true)
  }

  function openEditForm(category: Category) {
    if (!canManage) return
    setIsCreating(false)
    setEditingId(category.id)
    setFormValues({
      name: category.name,
      description: category.description ?? '',
    })
    setFieldErrors({})
    setFormError(null)
    setSuccessMessage(null)
  }

  function closeForm() {
    setIsCreating(false)
    setEditingId(null)
    setFormValues(emptyForm)
    setFieldErrors({})
    setFormError(null)
  }

  function updateField(field: CategoryField, value: string) {
    setFormValues((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
    setFormError(null)
  }

  async function submitCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canManage || isSubmitting || (!isCreating && !editingId)) return

    const name = formValues.name.trim()
    const description = formValues.description.trim() || null
    if (!name) {
      setFieldErrors({ name: 'Category name must not be blank.' })
      setFormError('Review the highlighted fields and try again.')
      return
    }

    setFieldErrors({})
    setFormError(null)
    setSuccessMessage(null)
    setIsSubmitting(true)

    try {
      if (isCreating) {
        const created = await runAuthenticated((accessToken) =>
          createCategory(accessToken, { name, description }),
        )
        setCategories((current) => [...(current ?? []), created])
        setSuccessMessage(`Category ${created.name} created successfully.`)
      } else if (editingId) {
        const updated = await runAuthenticated((accessToken) =>
          updateCategory(accessToken, editingId, { name, description }),
        )
        setCategories((current) => replaceCategory(current ?? [], updated))
        setSuccessMessage(`Category ${updated.name} updated successfully.`)
      }
      closeForm()
    } catch (error) {
      const result = categoryError(error)
      setFieldErrors(result.fieldErrors)
      setFormError(result.formError)
    } finally {
      setIsSubmitting(false)
    }
  }

  function requestLifecycleChange(category: Category) {
    if (!canManage || pendingLifecycleId || lifecycleTarget) return
    setLifecycleTarget(category)
  }

  async function confirmLifecycleChange() {
    const category = lifecycleTarget
    if (!category || !canManage || pendingLifecycleId || lifecycleRequestRef.current) return

    lifecycleRequestRef.current = true
    setPendingLifecycleId(category.id)
    setFormError(null)
    setSuccessMessage(null)

    try {
      const updated = await runAuthenticated((accessToken) =>
        category.isActive
          ? archiveCategory(accessToken, category.id)
          : updateCategory(accessToken, category.id, { isActive: true }),
      )
      setCategories((current) => replaceCategory(current ?? [], updated))
      setSuccessMessage(
        `Category ${updated.name} ${updated.isActive ? 'reactivated' : 'archived'} successfully.`,
      )
    } catch (error) {
      setFormError(categoryError(error).formError)
    } finally {
      lifecycleRequestRef.current = false
      setPendingLifecycleId(null)
      setLifecycleTarget(null)
    }
  }

  if (!categories && !loadError) {
    return <LoadingScreen message="Loading Categories…" />
  }

  const showForm = canManage && (isCreating || editingId !== null)

  return (
    <section className="page-stack" aria-labelledby="categories-heading">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Product catalog</p>
          <h1 id="categories-heading">Categories</h1>
          <p>Organize Products while preserving archived relationships.</p>
        </div>
        {canManage ? (
          !showForm && (
            <button className="button button--primary" onClick={openCreateForm}>
              Create Category
            </button>
          )
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

      {successMessage && (
        <div className="alert alert--success" role="status">
          {successMessage}
        </div>
      )}

      {formError && !showForm && (
        <div className="alert alert--error" role="alert">{formError}</div>
      )}

      {showForm && (
        <form className="management-card form-stack" noValidate onSubmit={submitCategory}>
          <div>
            <p className="card-label">{isCreating ? 'New Category' : 'Editing Category'}</p>
            <h2>{isCreating ? 'Create Category' : 'Update Category details'}</h2>
          </div>
          {formError && <div className="alert alert--error" role="alert">{formError}</div>}
          <label className="field">
            <span>Name</span>
            <input
              aria-label="Name"
              aria-describedby={fieldErrors.name ? 'category-name-error' : undefined}
              aria-invalid={fieldErrors.name ? 'true' : undefined}
              disabled={isSubmitting}
              maxLength={200}
              name="name"
              onChange={(event) => updateField('name', event.target.value)}
              required
              value={formValues.name}
            />
            {fieldErrors.name && <small className="field-error" id="category-name-error">{fieldErrors.name}</small>}
          </label>
          <label className="field">
            <span>Description <span className="optional-label">Optional</span></span>
            <textarea
              aria-label="Description"
              aria-describedby={fieldErrors.description ? 'category-description-error' : undefined}
              aria-invalid={fieldErrors.description ? 'true' : undefined}
              disabled={isSubmitting}
              maxLength={2000}
              name="description"
              onChange={(event) => updateField('description', event.target.value)}
              rows={3}
              value={formValues.description}
            />
            {fieldErrors.description && <small className="field-error" id="category-description-error">{fieldErrors.description}</small>}
          </label>
          <div className="form-actions">
            <button className="button button--secondary" disabled={isSubmitting} onClick={closeForm} type="button">Cancel</button>
            <button className="button button--primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Saving Category…' : isCreating ? 'Create Category' : 'Save changes'}
            </button>
          </div>
        </form>
      )}

      {categories && categories.length === 0 && !loadError && (
        <div className="empty-state">
          <p className="card-label">No Categories</p>
          <h2>Your Category list is empty</h2>
          <p>
            {canManage
              ? 'Create your first Category, or keep Products Uncategorized.'
              : 'No Categories have been created yet. Products can still be Uncategorized.'}
          </p>
          {canManage && !showForm && (
            <button className="button button--primary" onClick={openCreateForm}>Create first Category</button>
          )}
        </div>
      )}

      {categories && categories.length > 0 && (
        <div className="category-list" aria-label="Category list">
          {categories.map((category) => (
            <article className="management-card category-card" key={category.id}>
              <div className="category-card__content">
                <div className="title-with-status">
                  <h2>{category.name}</h2>
                  <LifecycleBadge isActive={category.isActive} />
                </div>
                <p>{category.description ?? 'No description provided.'}</p>
              </div>
              {canManage && (
                <div className="row-actions">
                  <button className="button button--secondary button--small" disabled={pendingLifecycleId === category.id} onClick={() => openEditForm(category)} type="button">Edit</button>
                  <button
                    className={`button button--small ${category.isActive ? 'button--danger' : 'button--secondary'}`}
                    disabled={pendingLifecycleId === category.id || lifecycleTarget !== null}
                    onClick={() => requestLifecycleChange(category)}
                    type="button"
                  >
                    {pendingLifecycleId === category.id
                      ? 'Updating…'
                      : category.isActive
                        ? 'Archive Category'
                        : 'Reactivate Category'}
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {lifecycleTarget && (
        <ConfirmationDialog
          confirmLabel={lifecycleTarget.isActive ? 'Archive Category' : 'Reactivate Category'}
          description={
            lifecycleTarget.isActive
              ? `Archive ${lifecycleTarget.name}? Existing Products will keep this Category. It cannot be assigned to new Products while archived, and it can be reactivated later.`
              : `Reactivate ${lifecycleTarget.name}? It can be assigned to Products again.`
          }
          isDestructive={lifecycleTarget.isActive}
          isPending={pendingLifecycleId === lifecycleTarget.id}
          onCancel={() => setLifecycleTarget(null)}
          onConfirm={confirmLifecycleChange}
          pendingLabel={lifecycleTarget.isActive ? 'Archiving Category…' : 'Reactivating Category…'}
          title={lifecycleTarget.isActive ? 'Archive Category?' : 'Reactivate Category?'}
        />
      )}
    </section>
  )
}
