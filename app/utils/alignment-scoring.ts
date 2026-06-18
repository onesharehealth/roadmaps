export type PropertyVote = {
  propertyUuid: string
  itemUuid: string
  username: string
  value: number
}

export type AlignmentScore = 'aligned' | 'not aligned'

export interface AlignmentAnalysis {
  score: AlignmentScore
  confidence: number
  details: {
    totalVotes: number
    clusteredVotes: number
    outlierVotes: number
    coefficientOfVariation: number
    interquartileRange: number
    mainClusterSize: number
    mainClusterPercentage: number
  }
}

export function calculateAlignmentScore({
  votes,
}: {
  votes: PropertyVote[]
}): AlignmentAnalysis {
  const values = votes.map((vote) => vote.value).sort((a, b) => a - b)
  const totalVotes = values.length

  const analysis: AlignmentAnalysis = {
    score: 'not aligned',
    confidence: 0,
    details: {
      totalVotes,
      clusteredVotes: 0,
      outlierVotes: 0,
      coefficientOfVariation: 0,
      interquartileRange: 0,
      mainClusterSize: 0,
      mainClusterPercentage: 0,
    },
  }

  if (totalVotes < 2) {
    analysis.confidence = 0.9
    return analysis
  }

  if (totalVotes === 2) {
    const [vote1, vote2] = values
    const difference = Math.abs(vote1 - vote2)
    if (vote1 === vote2 || difference <= 1) {
      analysis.score = 'aligned'
      analysis.confidence = vote1 === vote2 ? 0.8 : 0.7
      analysis.details.mainClusterSize = 2
      analysis.details.mainClusterPercentage = 1
      return analysis
    }
    analysis.confidence = 0.8
    return analysis
  }

  const mean = values.reduce((sum, val) => sum + val, 0) / totalVotes
  const variance =
    values.reduce((sum, val) => Math.pow(val - mean, 2), 0) / totalVotes
  const coefficientOfVariation = mean > 0 ? Math.sqrt(variance) / mean : 0

  const q1 = values[Math.floor(totalVotes * 0.25)]
  const q3 = values[Math.floor(totalVotes * 0.75)]
  const iqr = q3 - q1
  const lowerBound = q1 - 1.5 * iqr
  const upperBound = q3 + 1.5 * iqr
  const outliers = values.filter((val) => val < lowerBound || val > upperBound)

  let maxClusterSize = 0
  for (let center = 1; center <= 5; center += 0.5) {
    const clustered = values.filter((val) => Math.abs(val - center) <= 0.5)
    if (clustered.length > maxClusterSize) maxClusterSize = clustered.length
  }

  const mainClusterPercentage = maxClusterSize / totalVotes
  analysis.details = {
    totalVotes,
    clusteredVotes: values.length - outliers.length,
    outlierVotes: outliers.length,
    coefficientOfVariation,
    interquartileRange: iqr,
    mainClusterSize: maxClusterSize,
    mainClusterPercentage,
  }

  let alignmentScore = 0
  if (coefficientOfVariation < 0.15) alignmentScore += 0.4
  else if (coefficientOfVariation > 0.35) alignmentScore -= 0.4
  if (mainClusterPercentage >= 0.75) alignmentScore += 0.3
  else alignmentScore -= 0.2

  analysis.score = alignmentScore > 0.3 ? 'aligned' : 'not aligned'
  analysis.confidence = 0.7
  return analysis
}
