import { useNavigate } from 'react-router'

export function TestNavigation({ path }: { path: string }) {
  const navigate = useNavigate()

  return (
    <button hidden data-testid="catalog-navigation" onClick={() => navigate(path)}>
      Navigate
    </button>
  )
}
