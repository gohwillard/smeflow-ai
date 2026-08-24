import { Link } from 'react-router'
import { useAuth } from '../features/auth/auth-context'

export function ApplicationHomePage() {
  const { user } = useAuth()

  if (!user) {
    return null
  }

  return (
    <section className="page-stack" aria-labelledby="home-heading">
      <div className="welcome-card">
        <p className="eyebrow">Authenticated workspace</p>
        <h1 id="home-heading">Welcome, {user.firstName}.</h1>
        <p>
          Your protected SMEFlow workspace brings your core business data
          together in one place.
        </p>
      </div>

      <div className="content-grid">
        <article className="content-card">
          <p className="card-label">Current user</p>
          <h2>
            {user.firstName} {user.lastName}
          </h2>
          <dl className="summary-list">
            <div>
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>
                <span className="role-badge">{user.role}</span>
              </dd>
            </div>
          </dl>
        </article>

        <article className="content-card content-card--action">
          <p className="card-label">Product catalog</p>
          <h2>Manage Products and Categories</h2>
          <p>View master data, lifecycle status, and read-only stock balances.</p>
          <div className="row-actions">
            <Link className="button button--primary" to="/products">
              Open Products
            </Link>
            <Link className="button button--secondary" to="/categories">
              Categories
            </Link>
          </div>
        </article>

        <article className="content-card content-card--action">
          <p className="card-label">Company</p>
          <h2>View your company profile</h2>
          <p>Company data is loaded from a protected, company-scoped API.</p>
          <Link className="button button--secondary" to="/company">
            Open company profile
          </Link>
        </article>

        <article className="content-card content-card--action">
          <p className="card-label">Customers &amp; Suppliers</p>
          <h2>Manage Customers and Suppliers</h2>
          <p>
            Maintain the people and organizations your Company sells to and
            buys from.
          </p>
          <div className="row-actions">
            <Link className="button button--primary" to="/customers">
              Customers
            </Link>
            <Link className="button button--secondary" to="/suppliers">
              Suppliers
            </Link>
          </div>
        </article>
      </div>

      <aside className="notice-card">
        <strong>Memory-only session</strong>
        <span>
          For this MVP milestone, refreshing the browser clears your access
          token and requires you to sign in again.
        </span>
      </aside>
    </section>
  )
}
