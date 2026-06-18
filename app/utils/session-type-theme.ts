import type { CSSProperties } from 'react'
import type { SessionType } from 'roadmaps-agents/schemas'

/** Matches dot voting UI (`DotVotingItemCard`, `DotsSummaryVisualization`). */
const DOT_VOTING_COLOR = '#ff0f87'

const sessionTypeTheme = {
  timeline: {
    iconColor: '#16a34a',
    badgeBackground: '#dcfce7',
    hoverBorderColor: '#bbf7d0',
    hoverBackgroundEnd: '#f0fdf4',
  },
  dot_voting: {
    iconColor: DOT_VOTING_COLOR,
    badgeBackground: '#ffe8f4',
    hoverBorderColor: '#f9a8d4',
    hoverBackgroundEnd: '#fff5fa',
  },
  property_voting: {
    iconColor: 'hsl(217 91% 50%)',
    badgeBackground: 'hsl(214 95% 93%)',
    hoverBorderColor: '#bfdbfe',
    hoverBackgroundEnd: 'hsl(214 95% 97%)',
  },
} as const satisfies Record<
  SessionType,
  {
    iconColor: string
    badgeBackground: string
    hoverBorderColor: string
    hoverBackgroundEnd: string
  }
>

export function getSessionTypeTheme(sessionType: SessionType) {
  return sessionTypeTheme[sessionType]
}

export function getSessionTileHoverStyle(sessionType: SessionType) {
  const theme = getSessionTypeTheme(sessionType)

  return {
    '--session-tile-hover-border': theme.hoverBorderColor,
    '--session-tile-hover-bg-end': theme.hoverBackgroundEnd,
  } as CSSProperties
}

export function getSessionOptionHoverStyle(sessionType: SessionType) {
  const theme = getSessionTypeTheme(sessionType)

  return {
    '--session-option-hover-bg': theme.hoverBackgroundEnd,
  } as CSSProperties
}
