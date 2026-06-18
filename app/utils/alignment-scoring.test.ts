import { describe, expect, it } from 'vitest'

import { calculateAlignmentScore } from './alignment-scoring'

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
})
