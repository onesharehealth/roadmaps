import type { ReactNode } from 'react'
import type { SessionType } from 'roadmaps-agents/schemas'

import { cn } from '~/lib/utils'
import { getSessionTypeTheme } from '~/utils/session-type-theme'
type SessionTypeIconProps = {
  sessionType: SessionType
  /** Preset or explicit icon size in pixels. Defaults to 32 (`sm`). */
  size?: 'sm' | 'lg' | number
  className?: string
}

const sizePixels = {
  sm: 32,
  lg: 128,
} as const

function resolveIconPixels(size: 'sm' | 'lg' | number = 'sm') {
  return typeof size === 'number' ? size : sizePixels[size]
}

function TimelineIcon() {
  return (
    <>
      <rect
        x="4"
        y="6"
        width="20"
        height="4"
        rx="1"
        fill="currentColor"
        opacity="0.9"
      />
      <rect
        x="8"
        y="14"
        width="16"
        height="4"
        rx="1"
        fill="currentColor"
        opacity="0.7"
      />
      <rect
        x="4"
        y="22"
        width="12"
        height="4"
        rx="1"
        fill="currentColor"
        opacity="0.5"
      />
    </>
  )
}

function DotVotingIcon() {
  return (
    <>
      <circle
        cx="10"
        cy="16"
        r="4"
        fill="currentColor"
      />
      <circle
        cx="18"
        cy="10"
        r="4"
        fill="currentColor"
        opacity="0.85"
      />
      <circle
        cx="18"
        cy="22"
        r="4"
        fill="currentColor"
        opacity="0.7"
      />
    </>
  )
}

function PropertyVotingIcon() {
  return (
    <>
      <line
        x1="4"
        y1="16"
        x2="28"
        y2="16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.4"
      />
      <circle
        cx="9"
        cy="16"
        r="4"
        fill="currentColor"
        opacity="0.55"
      />
      <circle
        cx="14"
        cy="16"
        r="4"
        fill="currentColor"
        opacity="0.7"
      />
      <circle
        cx="19"
        cy="16"
        r="4"
        fill="currentColor"
        opacity="0.85"
      />
      <circle
        cx="24"
        cy="16"
        r="4"
        fill="currentColor"
      />
    </>
  )
}

const iconByType = {
  timeline: TimelineIcon,
  dot_voting: DotVotingIcon,
  property_voting: PropertyVotingIcon,
} as const satisfies Record<SessionType, () => ReactNode>

export function SessionTypeIcon({
  sessionType,
  size = 'sm',
  className,
}: SessionTypeIconProps) {
  const pixels = resolveIconPixels(size)
  const Icon = iconByType[sessionType]
  const { iconColor } = getSessionTypeTheme(sessionType)

  return (
    <svg
      viewBox="0 0 32 32"
      width={pixels}
      height={pixels}
      aria-hidden
      className={cn('shrink-0', className)}
      style={{ color: iconColor }}
    >
      <Icon />
    </svg>
  )
}

type SessionTypeIconBadgeProps = {
  sessionType: SessionType
  /** Preset or explicit icon size in pixels. Defaults to 32 (`sm`). */
  iconSize?: 'sm' | 'lg' | number
  /** Badge container size in pixels. Defaults to 48. */
  badgeSize?: number
  className?: string
}

export function SessionTypeIconBadge({
  sessionType,
  iconSize = 'sm',
  badgeSize = 48,
  className,
}: SessionTypeIconBadgeProps) {
  const { badgeBackground } = getSessionTypeTheme(sessionType)

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-lg',
        className,
      )}
      style={{
        width: badgeSize,
        height: badgeSize,
        backgroundColor: badgeBackground,
      }}
    >
      <SessionTypeIcon
        sessionType={sessionType}
        size={iconSize}
      />
    </div>
  )
}
