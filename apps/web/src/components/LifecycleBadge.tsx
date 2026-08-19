type LifecycleBadgeProps = {
  isActive: boolean
}

export function LifecycleBadge({ isActive }: LifecycleBadgeProps) {
  return (
    <span
      className={`status-badge ${isActive ? 'status-badge--active' : 'status-badge--archived'}`}
    >
      {isActive ? 'Active' : 'Archived'}
    </span>
  )
}
