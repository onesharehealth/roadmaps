const relativeTimeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

const relativeTimeUnits = [
  ['year', 60 * 60 * 24 * 365],
  ['month', 60 * 60 * 24 * 30],
  ['week', 60 * 60 * 24 * 7],
  ['day', 60 * 60 * 24],
  ['hour', 60 * 60],
  ['minute', 60],
  ['second', 1],
] as const satisfies ReadonlyArray<[Intl.RelativeTimeFormatUnit, number]>

export function formatRelativeTimeAgo(timestampSeconds: number) {
  const secondsAgo = Math.max(0, Math.floor(Date.now() / 1000) - timestampSeconds)

  if (secondsAgo < 1) return 'just now'

  for (const [unit, unitSeconds] of relativeTimeUnits) {
    const value = Math.floor(secondsAgo / unitSeconds)
    if (value >= 1) return relativeTimeFormatter.format(-value, unit)
  }

  return relativeTimeFormatter.format(-secondsAgo, 'second')
}
