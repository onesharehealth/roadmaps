import { scaleOrdinal } from '@visx/scale'
import { Circle } from '@visx/shape'
import { Axis, GlyphSeries, XYChart } from '@visx/xychart'
import { PROPERTY_VOTE_LABELS, PropertyVoteValue } from 'roadmaps-agents/schemas'

interface PropertyVoteData {
  value: PropertyVoteValue
  username: string
}

interface ProcessedPropertyVoteData extends PropertyVoteData {
  jitteredValue: number
  yPosition: number
}

interface PropertyVotingVisualizationProps {
  votes: PropertyVoteData[]
  propertyName: string
  width?: number
  height?: number
}

const accessors = {
  xAccessor: (d: ProcessedPropertyVoteData) => d.jitteredValue,
  yAccessor: (d: ProcessedPropertyVoteData) => d.yPosition,
}

// Helper function to add jitter to overlapping votes
function addJitterToPropertyVotes(votes: PropertyVoteData[]): ProcessedPropertyVoteData[] {
  const jitterAmount = 0.15 // Amount of jitter to add
  const processedVotes: ProcessedPropertyVoteData[] = []

  // Group votes by value to detect overlaps
  const valueGroups = new Map<PropertyVoteValue, PropertyVoteData[]>()

  votes.forEach((vote) => {
    if (!valueGroups.has(vote.value)) {
      valueGroups.set(vote.value, [])
    }
    valueGroups.get(vote.value)!.push(vote)
  })

  // Add jitter to overlapping votes
  valueGroups.forEach((votesAtValue, value) => {
    if (votesAtValue.length === 1) {
      // No overlap, no jitter needed
      const vote = votesAtValue[0]
      processedVotes.push({
        ...vote,
        jitteredValue: vote.value,
        yPosition: 0.5, // Single horizontal line
      })
    } else {
      // Multiple votes at same value, add jitter
      votesAtValue.forEach((vote, index) => {
        const angle = (2 * Math.PI * index) / votesAtValue.length
        const radius = jitterAmount * Math.min(1, votesAtValue.length / 4)

        processedVotes.push({
          ...vote,
          jitteredValue: vote.value + Math.cos(angle) * radius,
          yPosition: 0.5 + Math.sin(angle) * radius,
        })
      })
    }
  })

  return processedVotes
}

export function PropertyVotingVisualization({
  votes,
  propertyName,
  width = 380,
  height = 150,
}: PropertyVotingVisualizationProps) {
  // Process votes to add jitter for overlapping positions
  const processedVotes = addJitterToPropertyVotes(votes)

  // Algorithmic color generation for users
  const generateUserColors = (count: number): string[] => {
    const colors: string[] = []

    for (let i = 0; i < count; i++) {
      // Use golden ratio for good distribution
      const goldenRatio = 0.618033988749
      const hue = (i * goldenRatio * 360) % 360

      // Keep saturation and lightness consistent for user colors
      const saturation = 70
      const lightness = 55

      colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`)
    }

    return colors
  }

  const uniqueUsernames = Array.from(new Set(votes.map((v) => v.username)))
  const generatedUserColors = generateUserColors(uniqueUsernames.length)

  const colorScale = scaleOrdinal<string, string>({
    domain: uniqueUsernames,
    range: generatedUserColors,
  })

  const margin = { top: 5, right: 10, bottom: 35, left: 10 }
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom

  if (votes.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded border border-gray-200 bg-gray-50"
        style={{ width, height }}
      >
        <span className="text-xs text-gray-500">No votes yet</span>
      </div>
    )
  }

  return (
    <div className="rounded border border-gray-200 bg-white p-2">
      <XYChart
        width={width}
        height={height}
        margin={margin}
        xScale={{
          type: 'linear',
          domain: [-0.5, 4.5],
        }}
        yScale={{
          type: 'linear',
          domain: [0, 1],
        }}
      >
        {/* X-Axis with 5-point scale labels */}
        <Axis
          orientation="bottom"
          tickValues={[0, 1, 2, 3, 4]}
          tickFormat={(value) => {
            return PROPERTY_VOTE_LABELS[value as PropertyVoteValue] || ''
          }}
          tickLabelProps={{ fontSize: 10, textAnchor: 'middle', fontFamily: 'Mona Sans' }}
          label={propertyName}
          labelProps={{
            fontSize: 11,
            textAnchor: 'middle',
            dy: 12,
            fontFamily: 'Mona Sans',
          }}
        />

        {/* Vote points */}
        <GlyphSeries
          dataKey="votes"
          data={processedVotes}
          xAccessor={accessors.xAccessor}
          yAccessor={accessors.yAccessor}
          renderGlyph={(glyphProps) => {
            const { x, y, datum } = glyphProps
            return (
              <Circle
                key={`vote-${datum.username}-${datum.value}-${Math.random()}`}
                cx={x}
                cy={y}
                r={6}
                fill={colorScale(datum.username)}
                fillOpacity={0.8}
                stroke="white"
                strokeWidth={0.5}
              />
            )
          }}
        />
      </XYChart>

      {/* Legend */}
      {votes.length > 0 && (
        <div className="mt-0 flex flex-wrap justify-center gap-1">
          {uniqueUsernames.map((username) => {
            const userVoteCount = votes.filter((v) => v.username === username).length
            return (
              <div key={username} className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: colorScale(username) }} />
                <span className="text-xs text-gray-600">
                  {username.length > 8 ? `${username.slice(0, 8)}...` : username}
                  {userVoteCount > 1 && ` (${userVoteCount})`}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Helper function to transform property vote to visualization data
export function transformPropertyVoteToData(vote: { value: number; username: string }): PropertyVoteData {
  return {
    value: vote.value as PropertyVoteValue,
    username: vote.username,
  }
}
