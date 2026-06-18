import { useCallback, useState } from 'react'
import type { RoadmapItem } from 'roadmaps-agents/schemas'
import type { CompleteDotStats } from 'roadmaps-agents/schemas'

interface SavedFilters {
  selectedTags: Set<string>
  selectedEstimates: Set<string>
  showOnlyWithVotes: boolean
}

interface UseOutcomeModeProps {
  items: RoadmapItem[]
  completeDotStats?: CompleteDotStats | null
}

interface UseOutcomeModeReturn {
  isOutcomeMode: boolean
  toggleOutcomeMode: () => void
  itemsWithVotes: RoadmapItem[]
  itemsWithoutVotes: RoadmapItem[]
  savedFilters: SavedFilters | null
}

export function useOutcomeMode({ items, completeDotStats }: UseOutcomeModeProps): UseOutcomeModeReturn {
  const [isOutcomeMode, setIsOutcomeMode] = useState(false)
  const [savedFilters, setSavedFilters] = useState<SavedFilters | null>(null)

  const toggleOutcomeMode = useCallback(() => {
    setIsOutcomeMode((prev) => !prev)
  }, [])

  // Items that have at least one vote
  const itemsWithVotes = items.filter((item) => {
    const itemStats = completeDotStats?.itemStats.find((s) => s.itemUuid === item.uuid)
    return itemStats && itemStats.totalVotes > 0
  })

  // Items that have no votes
  const itemsWithoutVotes = items.filter((item) => {
    const itemStats = completeDotStats?.itemStats.find((s) => s.itemUuid === item.uuid)
    return !itemStats || itemStats.totalVotes === 0
  })

  return {
    isOutcomeMode,
    toggleOutcomeMode,
    itemsWithVotes,
    itemsWithoutVotes,
    savedFilters,
  }
}

