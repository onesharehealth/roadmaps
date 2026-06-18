export const ESTIMATE_SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL'] as const

export type EstimateSizeLabel = (typeof ESTIMATE_SIZE_ORDER)[number]

export const ESTIMATE_NUMBER_TO_LABEL: Record<number, EstimateSizeLabel> = {
  1: 'XS',
  2: 'S',
  3: 'M',
  4: 'L',
  5: 'XL',
}

const ESTIMATE_LABEL_TO_NUMBER: Record<EstimateSizeLabel, number> = {
  XS: 1,
  S: 2,
  M: 3,
  L: 4,
  XL: 5,
}

export function isKnownEstimate(
  estimate: number,
): estimate is keyof typeof ESTIMATE_NUMBER_TO_LABEL {
  return estimate in ESTIMATE_NUMBER_TO_LABEL
}

export function formatEstimate(estimate: number | null | undefined): string {
  if (estimate == null) return '--'
  if (isKnownEstimate(estimate)) return ESTIMATE_NUMBER_TO_LABEL[estimate]
  return String(estimate)
}

export function parseEstimateLabel(label: string | null): number | null {
  if (!label || label === '--') return null
  const normalized = label.toUpperCase() as EstimateSizeLabel
  return ESTIMATE_LABEL_TO_NUMBER[normalized] ?? null
}

export function sortEstimateLabels(labels: string[]): string[] {
  const unknown: string[] = []
  const known = new Set<string>()

  for (const label of labels) {
    if (label === '--') continue
    if (ESTIMATE_SIZE_ORDER.includes(label as EstimateSizeLabel)) {
      known.add(label)
    } else {
      unknown.push(label)
    }
  }

  const sortedKnown = ESTIMATE_SIZE_ORDER.filter((size) => known.has(size))
  const sortedUnknown = unknown.sort((a, b) => a.localeCompare(b))

  return [...sortedKnown, ...sortedUnknown]
}
