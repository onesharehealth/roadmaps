import { type ReactNode } from 'react'

type SessionSettingsSectionProps = {
  title: string
  description?: string
  children: ReactNode
}

export function SessionSettingsSection({ title, description, children }: SessionSettingsSectionProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
      </div>
      {children}
    </div>
  )
}
