import { describe, expect, it } from 'vitest'

import { filterExcludeSubIssues, type LinearIssue } from './linear.server'

function makeIssue(
  overrides: Partial<LinearIssue> & Pick<LinearIssue, 'identifier' | 'title'>,
): LinearIssue {
  return {
    priority: 'None',
    state: 'Todo',
    url: 'https://linear.app/test',
    createdAt: '2024-01-01T00:00:00Z',
    labels: [],
    ...overrides,
  }
}

describe('filterExcludeSubIssues', () => {
  it('removes issues that have a parent', () => {
    const issues = [
      makeIssue({ identifier: 'TEST-1', title: 'Parent issue' }),
      makeIssue({
        identifier: 'TEST-2',
        title: 'Sub issue',
        parent: { id: 'parent-id', title: 'Parent issue' },
      }),
    ]

    const result = filterExcludeSubIssues({ issues })

    expect(result).toHaveLength(1)
    expect(result[0].identifier).toBe('TEST-1')
  })

  it('returns all issues when none are sub-issues', () => {
    const issues = [
      makeIssue({ identifier: 'TEST-1', title: 'First' }),
      makeIssue({ identifier: 'TEST-2', title: 'Second' }),
    ]

    expect(filterExcludeSubIssues({ issues })).toHaveLength(2)
  })

  it('returns an empty array when all issues are sub-issues', () => {
    const issues = [
      makeIssue({
        identifier: 'TEST-1',
        title: 'Sub one',
        parent: { id: 'p1', title: 'Parent' },
      }),
      makeIssue({
        identifier: 'TEST-2',
        title: 'Sub two',
        parent: { id: 'p2', title: 'Other parent' },
      }),
    ]

    expect(filterExcludeSubIssues({ issues })).toHaveLength(0)
  })
})
