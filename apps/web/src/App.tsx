import { useEffect, useState } from 'react'
import { getHealth } from './api/health'
import './App.css'

type ConnectionStatus = 'checking' | 'online' | 'offline'

const statusContent: Record<
  ConnectionStatus,
  { label: string; message: string }
> = {
  checking: {
    label: 'Checking API...',
    message: 'Connecting to the SMEFlow backend service.',
  },
  online: {
    label: 'API Online',
    message: 'The React frontend is connected to the Express API.',
  },
  offline: {
    label: 'API Offline',
    message: 'Start the backend service, then refresh this page.',
  },
}

function App() {
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('checking')

  useEffect(() => {
    const controller = new AbortController()

    async function checkApiConnection() {
      try {
        await getHealth(controller.signal)
        setConnectionStatus('online')
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return
        }

        setConnectionStatus('offline')
      }
    }

    void checkApiConnection()

    return () => controller.abort()
  }, [])

  const currentStatus = statusContent[connectionStatus]

  return (
    <main className="foundation-page">
      <section className="foundation-card">
        <p className="eyebrow">SMEFlow AI</p>
        <h1>Business Management Platform</h1>
        <p className="intro">
          A practical foundation for managing SME operations, inventory, sales,
          and business insights.
        </p>

        <div
          className={`api-status api-status--${connectionStatus}`}
          role="status"
          aria-live="polite"
        >
          <span className="status-dot" aria-hidden="true" />
          <div>
            <p className="status-label">{currentStatus.label}</p>
            <p className="status-message">{currentStatus.message}</p>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
