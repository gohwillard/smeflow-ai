import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent, MouseEvent } from 'react'
import type {
  InventoryAdjustmentInput,
  InventoryMovementType,
  Product,
} from '../api/catalog'
import { ApiError } from '../api/client'

type InventoryAdjustmentDialogProps = {
  product: Product
  openingBalanceAvailable: boolean
  onCancel: () => void
  onSubmit: (input: InventoryAdjustmentInput) => Promise<void>
}

const quantityPattern = /^\d{1,11}(?:\.\d{1,3})?$/u

function adjustmentError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'INSUFFICIENT_STOCK') {
      return 'Insufficient stock for this adjustment.'
    }
    if (error.code === 'OPENING_BALANCE_NOT_ALLOWED') {
      return 'Opening Balance is no longer available for this Product.'
    }
    if (error.code === 'PRODUCT_INACTIVE') {
      return 'Archived Products cannot receive inventory adjustments.'
    }
    if (error.code === 'FORBIDDEN') {
      return 'You do not have permission to adjust inventory.'
    }
    if (error.code === 'VALIDATION_ERROR' && error.details[0]) {
      return error.details[0].message
    }
    return error.message
  }

  return 'The inventory adjustment could not be completed. Please try again.'
}

export function InventoryAdjustmentDialog({
  product,
  openingBalanceAvailable,
  onCancel,
  onSubmit,
}: InventoryAdjustmentDialogProps) {
  const [type, setType] = useState<InventoryMovementType>(
    openingBalanceAvailable ? 'OPENING_BALANCE' : 'MANUAL_IN',
  )
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')
  const [quantityError, setQuantityError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const typeSelectRef = useRef<HTMLSelectElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const submissionStartedRef = useRef(false)

  useEffect(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    typeSelectRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      previousFocusRef.current?.focus()
    }
  }, [])

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && !isSubmitting) {
      event.preventDefault()
      onCancel()
      return
    }

    if (event.key !== 'Tab') return
    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)',
      ) ?? [],
    )
    if (focusable.length === 0) {
      event.preventDefault()
      return
    }
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  function handleBackdropMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget && !isSubmitting) onCancel()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting || submissionStartedRef.current) return

    const normalizedQuantity = quantity.trim()
    if (!quantityPattern.test(normalizedQuantity) || !/[1-9]/u.test(normalizedQuantity)) {
      setQuantityError(
        'Enter a quantity greater than zero with at most 3 decimal places.',
      )
      return
    }

    submissionStartedRef.current = true
    setIsSubmitting(true)
    setQuantityError(null)
    setSubmitError(null)

    const normalizedNote = note.trim()
    const input: InventoryAdjustmentInput = {
      type,
      quantity: normalizedQuantity,
      ...(normalizedNote ? { note: normalizedNote } : {}),
    }

    try {
      await onSubmit(input)
    } catch (error) {
      setSubmitError(adjustmentError(error))
    } finally {
      submissionStartedRef.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={handleBackdropMouseDown}>
      <div
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="inventory-dialog"
        onKeyDown={handleKeyDown}
        ref={dialogRef}
        role="dialog"
      >
        <div>
          <p className="card-label">Inventory operation</p>
          <h2 id={titleId}>Adjust Stock</h2>
          <p id={descriptionId}>
            Record a traceable inventory change for {product.name}.
          </p>
        </div>

        <div className="stock-readout" aria-label="Current stock">
          <span>Current Stock</span>
          <strong>{product.quantityOnHand} {product.unit}</strong>
          <small>The backend calculates and records the before and after balances.</small>
        </div>

        {submitError && <div className="alert alert--error" role="alert">{submitError}</div>}

        <form className="inventory-dialog__form" onSubmit={handleSubmit}>
          <label className="field">
            Adjustment type
            <select
              disabled={isSubmitting}
              onChange={(event) => setType(event.target.value as InventoryMovementType)}
              ref={typeSelectRef}
              value={type}
            >
              {openingBalanceAvailable && (
                <option value="OPENING_BALANCE">Opening Balance</option>
              )}
              <option value="MANUAL_IN">Stock In</option>
              <option value="MANUAL_OUT">Stock Out</option>
            </select>
          </label>

          <label className="field">
            Quantity
            <input
              aria-describedby={quantityError ? 'inventory-quantity-error' : undefined}
              aria-invalid={quantityError ? 'true' : undefined}
              autoComplete="off"
              disabled={isSubmitting}
              inputMode="decimal"
              onChange={(event) => {
                setQuantity(event.target.value)
                setQuantityError(null)
              }}
              placeholder="0.000"
              value={quantity}
            />
            {quantityError && (
              <span className="field-error" id="inventory-quantity-error">{quantityError}</span>
            )}
          </label>

          <label className="field">
            Note <span className="optional-label">Optional</span>
            <textarea
              disabled={isSubmitting}
              maxLength={2000}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              value={note}
            />
          </label>

          <div className="inventory-dialog__actions">
            <button
              className="button button--secondary"
              disabled={isSubmitting}
              onClick={onCancel}
              type="button"
            >
              Cancel
            </button>
            <button
              className="button button--primary"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Saving Adjustment…' : 'Save Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
