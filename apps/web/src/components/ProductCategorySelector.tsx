import type { Category } from '../api/catalog'
import { FormCombobox } from './FormCombobox'

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
  const options = [
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
  return (
    <FormCombobox
      ariaDescribedBy={ariaDescribedBy}
      ariaInvalid={ariaInvalid}
      disabled={disabled}
      labelId={labelId}
      onChange={onChange}
      options={options}
      value={value}
    />
  )
}
