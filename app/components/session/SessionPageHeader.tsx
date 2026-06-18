import type { ReactNode } from 'react'

export type ChannelDescriptorSection = {
  title: string
  description: ReactNode
}

export type SessionPageHeaderProps = {
  title: string
  description?: ReactNode
  sections?: ChannelDescriptorSection[]
}

const EMPTY_SECTIONS: ChannelDescriptorSection[] = []

export function SessionPageHeader({
  title,
  description,
  sections = EMPTY_SECTIONS,
}: SessionPageHeaderProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {description && (
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            {description}
          </p>
        )}
      </div>

      {sections.map((section) => (
        <div key={section.title}>
          <h3 className="text-base font-semibold text-gray-900">
            {section.title}
          </h3>
          <div className="mt-2 text-sm leading-relaxed text-gray-600">
            {section.description}
          </div>
        </div>
      ))}
    </div>
  )
}
