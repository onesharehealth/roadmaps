import { FloatingTooltip } from '~/components/roadmap/FloatingTooltip'

const DEFAULT_DOT_COLOR = '#ff0f87'
const PLACED_DOT_TOOLTIP =
  'Click on one of your placed dots below to return it to the pool'

interface DotsSummaryVisualizationProps {
  total: number
  used: number
}

export function DotsSummaryVisualization({
  total,
  used,
}: DotsSummaryVisualizationProps) {
  const available = Math.max(0, total - used)

  return (
    <div className="flex items-center gap-0 rounded-lg border border-amber-300 bg-amber-100 px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="text-sm text-gray-600">
          <span className="font-medium text-gray-700">Dots available: </span>
          <span className="font-medium text-gray-700">{available}</span>
          <span className="text-gray-500"> / </span>
          <span className="font-medium text-gray-700">{total}</span>
        </div>
        <svg
          width={total * 24}
          height="28"
          viewBox={`0 0 ${total * 24} 28`}
          className="h-7"
        >
          {Array.from({ length: total }).map((_, idx) => {
            const isAvailable = idx < available
            const x = idx * 24 + 12

            if (isAvailable) {
              return (
                <circle
                  key={idx}
                  cx={x}
                  cy="14"
                  r="8"
                  fill={DEFAULT_DOT_COLOR}
                  stroke={DEFAULT_DOT_COLOR}
                  strokeWidth="1.5"
                  className="transition-all"
                />
              )
            }

            return (
              <FloatingTooltip
                key={idx}
                content={PLACED_DOT_TOOLTIP}
                placement="top"
                maxWidth={200}
              >
                <g className="cursor-default">
                  <circle
                    cx={x}
                    cy="14"
                    r="8"
                    fill={DEFAULT_DOT_COLOR}
                    fillOpacity={0.001}
                    stroke="none"
                  />
                  <circle
                    cx={x}
                    cy="14"
                    r="8"
                    fill="none"
                    stroke={DEFAULT_DOT_COLOR}
                    strokeWidth="1.5"
                    strokeDasharray="2,2"
                    pointerEvents="none"
                    className="transition-all"
                  />
                </g>
              </FloatingTooltip>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
