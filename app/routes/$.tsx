import { data, Link } from 'react-router'

import type { Route } from './+types/$'

export function loader(_args: Route.LoaderArgs) {
  return data(null, { status: 404 })
}

export default function NotFoundPage() {
  return (
    <div className="auth-shell">
      <div className="card auth-card text-center">
        <p className="text-sm font-semibold tracking-wide text-primary uppercase">
          404
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you requested does not exist.
        </p>
        <Link
          to="/"
          className="btn btn-primary mt-6"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
