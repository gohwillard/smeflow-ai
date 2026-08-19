import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { Category } from '../api/catalog'

type CategoryOption = {
  value: string
  label: string
  isDisabled: boolean
}

type ProductCategorySelectorProps = {
  activeCategories: Category[]
  ariaDescribedBy?: string
  ariaInvalid?: boolean
  currentArchivedCategory?: Category
  disabled?: boolean
  labelId: string
  onChange: (categoryId: string) => void
  value: string
}

export function ProductCategorySelector({
  activeCategories,
  ariaDescribedBy,
  ariaInvalid = false,
  currentArchivedCategory,
  disabled = false,
  labelId,
  onChange,
  value,
}: ProductCategorySelectorProps) {
  const generatedId = useId()
  const listboxId = `product-category-listbox-${generatedId}`
  const selectorRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [optionsMaxHeight, setOptionsMaxHeight] = useState(272)
  const options: CategoryOption[] = [
    { value: '', label: 'Uncategorized', isDisabled: false },
    ...(currentArchivedCategory
      ? [
          {
            value: currentArchivedCategory.id,
            label: `${currentArchivedCategory.name} (Archived — current)`,
            isDisabled: true,
          },
        ]
      : []),
    ...activeCategories.map((category) => ({
      value: category.id,
      label: category.name,
      isDisabled: false,
    })),
  ]
  const selectedIndex = options.findIndex((option) => option.value === value)
  const selectedOption = options[selectedIndex] ?? options[0]

  useEffect(() => {
    if (!isOpen) return

    function closeOnOutsidePointer(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !selectorRef.current?.contains(event.target)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [isOpen])

  function openDropdown() {
    let triggerBounds = triggerRef.current?.getBoundingClientRect()
    const desiredOptionsHeight = Math.min(272, options.length * 43 + 12)
    if (
      triggerBounds &&
      window.innerHeight - triggerBounds.bottom - 16 < desiredOptionsHeight &&
      typeof triggerRef.current?.scrollIntoView === 'function'
    ) {
      triggerRef.current.scrollIntoView({ block: 'center' })
      triggerBounds = triggerRef.current.getBoundingClientRect()
    }
    if (triggerBounds) {
      const availableBelow = window.innerHeight - triggerBounds.bottom - 16
      setOptionsMaxHeight(
        Math.min(desiredOptionsHeight, Math.max(48, availableBelow)),
      )
    }
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0)
    setIsOpen(true)
  }

  function moveActiveOption(direction: 1 | -1) {
    let nextIndex = activeIndex
    for (let step = 0; step < options.length; step += 1) {
      nextIndex = (nextIndex + direction + options.length) % options.length
      if (!options[nextIndex]?.isDisabled) {
        setActiveIndex(nextIndex)
        return
      }
    }
  }

  function chooseOption(index: number) {
    const option = options[index]
    if (!option || option.isDisabled) return
    onChange(option.value)
    setActiveIndex(index)
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Escape' && isOpen) {
      event.preventDefault()
      setIsOpen(false)
      return
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!isOpen) {
        openDropdown()
      } else {
        moveActiveOption(event.key === 'ArrowDown' ? 1 : -1)
      }
      return
    }

    if ((event.key === 'Enter' || event.key === ' ') && !isOpen) {
      event.preventDefault()
      openDropdown()
      return
    }

    if ((event.key === 'Enter' || event.key === ' ') && isOpen) {
      event.preventDefault()
      chooseOption(activeIndex)
    }
  }

  return (
    <div
      className="category-selector"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false)
      }}
      ref={selectorRef}
    >
      <button
        aria-activedescendant={
          isOpen ? `${listboxId}-option-${activeIndex}` : undefined
        }
        aria-autocomplete="none"
        aria-controls={listboxId}
        aria-describedby={ariaDescribedBy}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-invalid={ariaInvalid || undefined}
        aria-labelledby={labelId}
        className="category-selector__trigger"
        disabled={disabled}
        onClick={() => (isOpen ? setIsOpen(false) : openDropdown())}
        onKeyDown={handleKeyDown}
        ref={triggerRef}
        role="combobox"
        type="button"
      >
        <span>{selectedOption.label}</span>
        <svg aria-hidden="true" viewBox="0 0 20 20">
          <path d={isOpen ? 'm6 12 4-4 4 4' : 'm6 8 4 4 4-4'} />
        </svg>
      </button>

      {isOpen && (
        <div
          aria-labelledby={labelId}
          className="category-selector__options"
          id={listboxId}
          role="listbox"
          style={{ maxHeight: `${optionsMaxHeight}px` }}
        >
          {options.map((option, index) => (
            <button
              aria-disabled={option.isDisabled || undefined}
              aria-selected={option.value === value}
              className={`category-selector__option${index === activeIndex ? ' category-selector__option--active' : ''}`}
              id={`${listboxId}-option-${index}`}
              key={option.value || 'uncategorized'}
              onClick={() => chooseOption(index)}
              onMouseEnter={() => {
                if (!option.isDisabled) setActiveIndex(index)
              }}
              role="option"
              tabIndex={-1}
              type="button"
            >
              <span>{option.label}</span>
              {option.value === value && !option.isDisabled && (
                <span aria-hidden="true" className="category-selector__check">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
