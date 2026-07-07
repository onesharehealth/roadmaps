import { describe, expect, it } from 'vitest'

import { calculateAlignmentScore } from './alignment-scoring'

function votesForValues(values: number[]) {
  return values.map((value, index) => ({
    propertyUuid: 'p',
    itemUuid: 'i',
    username: `user-${index}`,
    value,
  }))
}

describe('calculateAlignmentScore', () => {
  it('returns not aligned for a single vote', () => {
    const result = calculateAlignmentScore({
      votes: [{ propertyUuid: 'p', itemUuid: 'i', username: 'a', value: 5 }],
    })
    expect(result.score).toBe('not aligned')
  })

  it('returns aligned for two identical votes', () => {
    const result = calculateAlignmentScore({
      votes: [
        { propertyUuid: 'p', itemUuid: 'i', username: 'a', value: 4 },
        { propertyUuid: 'p', itemUuid: 'i', username: 'b', value: 4 },
      ],
    })
    expect(result.score).toBe('aligned')
  })

  it('returns aligned for two votes differing by 1', () => {
    const result = calculateAlignmentScore({
      votes: votesForValues([2, 3]),
    })
    expect(result.score).toBe('aligned')
  })

  it('returns aligned for medium, medium, high', () => {
    const result = calculateAlignmentScore({
      votes: votesForValues([2, 2, 3]),
    })
    expect(result.score).toBe('aligned')
  })

  it('returns aligned for medium, medium, max', () => {
    const result = calculateAlignmentScore({
      votes: votesForValues([2, 2, 4]),
    })
    expect(result.score).toBe('aligned')
  })

  it('returns aligned for unanimous medium votes', () => {
    const result = calculateAlignmentScore({
      votes: votesForValues([2, 2, 2]),
    })
    expect(result.score).toBe('aligned')
  })

  it('returns aligned for high, high, medium spread', () => {
    const result = calculateAlignmentScore({
      votes: votesForValues([2, 3, 3]),
    })
    expect(result.score).toBe('aligned')
  })

  it('returns not aligned for low, high, max', () => {
    const result = calculateAlignmentScore({
      votes: votesForValues([1, 3, 4]),
    })
    expect(result.score).toBe('not aligned')
  })

  it('returns not aligned for min, max, max', () => {
    const result = calculateAlignmentScore({
      votes: votesForValues([0, 4, 4]),
    })
    expect(result.score).toBe('not aligned')
  })
})
