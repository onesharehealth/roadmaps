import { useCallback, useMemo } from 'react'

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

function countByValue(values: number[]) {
  const counts = new Map<number, number>()
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return counts
}

function getPluralityValue(values: number[]) {
  const counts = countByValue(values)
  let bestValue = values[0]
  let bestCount = 0
  for (const [value, count] of counts) {
    if (count > bestCount) {
      bestCount = count
      bestValue = value
    }
  }
  return { value: bestValue, count: bestCount }
}

function alignedResult(totalVotes: number, mainClusterSize: number): AlignmentAnalysis {
  return {
    score: 'aligned',
    confidence: 0.8,
    details: {
      totalVotes,
      clusteredVotes: totalVotes,
      outlierVotes: 0,
      coefficientOfVariation: 0,
      interquartileRange: 0,
      mainClusterSize,
      mainClusterPercentage: mainClusterSize / totalVotes,
    },
  }
}

function evaluateTieredAlignment(values: number[]): AlignmentAnalysis | null {
  const totalVotes = values.length
  const min = values[0]
  const max = values[values.length - 1]
  const spread = max - min

  if (spread <= 1) {
    return alignedResult(totalVotes, totalVotes)
  }

  const { value: pluralityValue, count: pluralityCount } = getPluralityValue(values)
  const majorityThreshold = totalVotes / 2
  const strongPluralityThreshold = Math.ceil((2 * totalVotes) / 3)

  const allDissentAdjacent = values.every((value) => Math.abs(value - pluralityValue) <= 1)
  if (pluralityCount > majorityThreshold && allDissentAdjacent) {
    return alignedResult(totalVotes, pluralityCount)
  }

  if (pluralityCount >= strongPluralityThreshold && spread <= 2) {
    return alignedResult(totalVotes, pluralityCount)
  }

  return null
}

export function calculateAlignmentScore({ votes }: { votes: PropertyVote[] }): AlignmentAnalysis {
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

  const tieredResult = evaluateTieredAlignment(values)
  if (tieredResult) return tieredResult

  const mean = values.reduce((sum, val) => sum + val, 0) / totalVotes
  const variance = values.reduce((sum, val) => Math.pow(val - mean, 2), 0) / totalVotes
  const coefficientOfVariation = mean > 0 ? Math.sqrt(variance) / mean : 0

  const q1 = values[Math.floor(totalVotes * 0.25)]
  const q3 = values[Math.floor(totalVotes * 0.75)]
  const iqr = q3 - q1
  const lowerBound = q1 - 1.5 * iqr
  const upperBound = q3 + 1.5 * iqr
  const outliers = values.filter((val) => val < lowerBound || val > upperBound)

  let maxClusterSize = 0
  for (let center = 0; center <= 4; center += 0.5) {
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

  analysis.score = alignmentScore >= 0.3 ? 'aligned' : 'not aligned'
  analysis.confidence = 0.7
  return analysis
}
