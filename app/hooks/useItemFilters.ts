import { useMemo, useState } from 'react'
import type { RoadmapItem } from 'roadmaps-agents/schemas'
import type { DotVoteStats } from 'roadmaps-agents/schemas'

import { formatEstimate, sortEstimateLabels } from '~/utils/estimate'

interface ItemFilters {
  selectedTags: Set<string>
  selectedEstimates: Set<string>
  showOnlyWithVotes: boolean
}

export function useItemFilters(
  items: RoadmapItem[],
  dotStats?: DotVoteStats[],
) {
  const [filters, setFilters] = useState<ItemFilters>({
    selectedTags: new Set(),
    selectedEstimates: new Set(),
    showOnlyWithVotes: false,
  })

  // Extract all unique tags and estimates from items
  const { availableTags, availableEstimates, tagColorMap } = useMemo(() => {
    const tags = new Set<string>()
    const estimates = new Set<string>()
    const colorMap = new Map<string, string>()
    let hasItemsWithoutEstimate = false

    items.forEach((item) => {
      item.labels?.forEach((label) => {
        tags.add(label.text)
        // Store the first color we encounter for each tag text
        if (!colorMap.has(label.text)) {
          colorMap.set(label.text, label.color)
        }
      })
      if (item.estimate != null) {
        estimates.add(formatEstimate(item.estimate))
      } else {
        hasItemsWithoutEstimate = true
      }
    })

    const estimatesList = sortEstimateLabels(Array.from(estimates))

    // Add '--' (no estimate) option if there are items without estimates
    if (hasItemsWithoutEstimate) {
      estimatesList.push('--')
    }

    return {
      availableTags: Array.from(tags).sort(),
      availableEstimates: estimatesList,
      tagColorMap: colorMap,
    }
  }, [items])

  // Filter items based on selected tags, estimates, and votes
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // If tags are selected, item must have at least one matching tag
      if (filters.selectedTags.size > 0) {
        const hasMatchingTag = item.labels?.some((label) =>
          filters.selectedTags.has(label.text),
        )
        if (!hasMatchingTag) return false
      }

      // If estimates are selected, item's estimate must match one of them
      if (filters.selectedEstimates.size > 0) {
        // Check if '--' (no estimate) is selected
        const noEstimateSelected = filters.selectedEstimates.has('--')
        const hasMatchingEstimate =
          item.estimate != null &&
          filters.selectedEstimates.has(formatEstimate(item.estimate))
        const hasNoEstimate = !item.estimate && noEstimateSelected

        if (!hasMatchingEstimate && !hasNoEstimate) {
          return false
        }
      }

      // If showing only items with votes, check if item has any votes
      if (filters.showOnlyWithVotes) {
        const itemStats = dotStats?.find((stat) => stat.itemUuid === item.uuid)
        if (!itemStats || itemStats.votes.length === 0) {
          return false
        }
      }

      return true
    })
  }, [items, filters, dotStats])

  function toggleTag(tag: string) {
    setFilters((prev) => {
      const newTags = new Set(prev.selectedTags)
      newTags.has(tag) ? newTags.delete(tag) : newTags.add(tag)
      return { ...prev, selectedTags: newTags }
    })
  }

  function toggleEstimate(estimate: string) {
    setFilters((prev) => {
      const newEstimates = new Set(prev.selectedEstimates)
      newEstimates.has(estimate)
        ? newEstimates.delete(estimate)
        : newEstimates.add(estimate)
      return { ...prev, selectedEstimates: newEstimates }
    })
  }

  function clearFilters() {
    setFilters({
      selectedTags: new Set(),
      selectedEstimates: new Set(),
      showOnlyWithVotes: false,
    })
  }

  function toggleShowOnlyWithVotes() {
    setFilters((prev) => ({
      ...prev,
      showOnlyWithVotes: !prev.showOnlyWithVotes,
    }))
  }

  const isFiltered =
    filters.selectedTags.size > 0 ||
    filters.selectedEstimates.size > 0 ||
    filters.showOnlyWithVotes

  return {
    filteredItems,
    availableTags,
    availableEstimates,
    tagColorMap,
    selectedTags: filters.selectedTags,
    selectedEstimates: filters.selectedEstimates,
    showOnlyWithVotes: filters.showOnlyWithVotes,
    toggleTag,
    toggleEstimate,
    toggleShowOnlyWithVotes,
    clearFilters,
    isFiltered,
  }
}
