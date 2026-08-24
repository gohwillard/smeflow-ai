import { useId } from 'react'
import type { PartnerLifecycleStatus } from '../api/partners'
import { FormCombobox } from './FormCombobox'

type StatusFilterProps = {
  disabled?: boolean
  onChange: (value: PartnerLifecycleStatus | '') => void
  value: PartnerLifecycleStatus | ''
}

const statusOptions = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
]

function isStatusFilterValue(
  value: string,
): value is PartnerLifecycleStatus | '' {
  return value === '' || value === 'active' || value === 'archived'
}

export function StatusFilter({
  disabled = false,
  onChange,
  value,
}: StatusFilterProps) {
  const generatedId = useId()
  const labelId = `status-filter-label-${generatedId}`

  return (
    <div className="party-status-filter">
      <span id={labelId}>Status</span>
      <FormCombobox
        disabled={disabled}
        labelId={labelId}
        onChange={(nextValue) => {
          if (isStatusFilterValue(nextValue)) onChange(nextValue)
        }}
        options={statusOptions}
        value={value}
      />
    </div>
  )
}
