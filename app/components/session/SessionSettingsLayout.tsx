import { type ReactNode } from 'react'
import { Link } from 'react-router'

type SessionSettingsLayoutProps = {
  backTo: string
  title: string
  children: ReactNode
}

export function SessionSettingsLayout({
  backTo,
  title,
  children,
}: SessionSettingsLayoutProps) {
  return (
    <div className="page">
      <Link
        to={backTo}
        className="link-back"
      >
        ← Back to session
      </Link>

      <h1 className="mb-4 mt-4 text-2xl font-semibold">{title}</h1>

      {children}
    </div>
  )
}
