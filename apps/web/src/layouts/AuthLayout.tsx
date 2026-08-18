import { Outlet } from 'react-router'

export function AuthLayout() {
  return (
    <main className="auth-page">
      <section className="auth-introduction" aria-labelledby="brand-heading">
        <p className="eyebrow">SMEFlow AI</p>
        <h1 id="brand-heading">Run your business with clarity.</h1>
        <p>
          One secure workspace for your company, operations, and future business
          insights.
        </p>
      </section>

      <section className="auth-panel">
        <Outlet />
      </section>
    </main>
  )
}
