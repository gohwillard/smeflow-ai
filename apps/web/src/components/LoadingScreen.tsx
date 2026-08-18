type LoadingScreenProps = {
  message: string
}

export function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <main className="centered-page">
      <div className="loading-card" role="status" aria-live="polite">
        <span className="spinner" aria-hidden="true" />
        <p>{message}</p>
      </div>
    </main>
  )
}
