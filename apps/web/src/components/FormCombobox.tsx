import { forwardRef, useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

export type FormComboboxOption = {
  value: string
  label: string
  isDisabled?: boolean
}

type FormComboboxProps = {
  ariaDescribedBy?: string
  ariaInvalid?: boolean
  disabled?: boolean
  labelId: string
  onChange: (value: string) => void
  options: FormComboboxOption[]
  value: string
}

export const FormCombobox = forwardRef<HTMLButtonElement, FormComboboxProps>(
  function FormCombobox(
    {
      ariaDescribedBy,
      ariaInvalid = false,
      disabled = false,
      labelId,
      onChange,
      options,
      value,
    },
    forwardedRef,
  ) {
    const generatedId = useId()
    const listboxId = `form-combobox-listbox-${generatedId}`
    const comboboxRef = useRef<HTMLDivElement>(null)
    const triggerRef = useRef<HTMLButtonElement | null>(null)
    const [isOpen, setIsOpen] = useState(false)
    const [activeIndex, setActiveIndex] = useState(0)
    const [optionsMaxHeight, setOptionsMaxHeight] = useState(272)
    const selectedIndex = options.findIndex((option) => option.value === value)
    const selectedOption = options[selectedIndex] ?? options[0]

    useEffect(() => {
      if (!isOpen) return

      function closeOnOutsidePointer(event: PointerEvent) {
        if (
          event.target instanceof Node &&
          !comboboxRef.current?.contains(event.target)
        ) {
          setIsOpen(false)
        }
      }

      document.addEventListener('pointerdown', closeOnOutsidePointer)
      return () => document.removeEventListener('pointerdown', closeOnOutsidePointer)
    }, [isOpen])

    useEffect(() => {
      if (disabled) setIsOpen(false)
    }, [disabled])

    function setTriggerRef(node: HTMLButtonElement | null) {
      triggerRef.current = node
      if (typeof forwardedRef === 'function') {
        forwardedRef(node)
      } else if (forwardedRef) {
        forwardedRef.current = node
      }
    }

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
        event.stopPropagation()
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

    if (!selectedOption) return null

    return (
      <div
        className="form-combobox"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false)
        }}
        ref={comboboxRef}
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
          className="form-combobox__trigger"
          disabled={disabled}
          onClick={() => (isOpen ? setIsOpen(false) : openDropdown())}
          onKeyDown={handleKeyDown}
          ref={setTriggerRef}
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
            className="form-combobox__options"
            id={listboxId}
            role="listbox"
            style={{ maxHeight: `${optionsMaxHeight}px` }}
          >
            {options.map((option, index) => (
              <button
                aria-disabled={option.isDisabled || undefined}
                aria-selected={option.value === value}
                className={`form-combobox__option${index === activeIndex ? ' form-combobox__option--active' : ''}`}
                id={`${listboxId}-option-${index}`}
                key={option.value}
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
                  <span aria-hidden="true" className="form-combobox__check">✓</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  },
)
