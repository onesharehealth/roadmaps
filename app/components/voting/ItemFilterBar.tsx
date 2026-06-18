import { X } from 'lucide-react'

interface ItemFilterBarProps {
  availableTags: string[]
  availableEstimates: string[]
  tagColorMap: Map<string, string>
  selectedTags: Set<string>
  selectedEstimates: Set<string>
  showOnlyWithVotes: boolean
  onToggleTag: (tag: string) => void
  onToggleEstimate: (estimate: string) => void
  onToggleShowOnlyWithVotes: () => void
  onClearFilters: () => void
  isFiltered: boolean
  filteredCount: number
  totalCount: number
}

export function ItemFilterBar({
  availableTags,
  availableEstimates,
  tagColorMap,
  selectedTags,
  selectedEstimates,
  showOnlyWithVotes,
  onToggleTag,
  onToggleEstimate,
  onToggleShowOnlyWithVotes,
  onClearFilters,
  isFiltered,
  filteredCount,
  totalCount,
}: ItemFilterBarProps) {
  return (
    <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Tags Filter */}
          {availableTags.length > 0 &&
            availableTags.map((tag) => {
              const isSelected = selectedTags.has(tag)
              const color = tagColorMap.get(tag) || '#6B7280'
              return (
                <button
                  key={tag}
                  onClick={() => onToggleTag(tag)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors ${
                    isSelected
                      ? 'bg-green-600 text-white'
                      : 'border border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: isSelected ? 'white' : color }}
                  />
                  <span>{tag}</span>
                  {isSelected && <X size={12} />}
                </button>
              )
            })}

          {/* Estimates Filter */}
          {availableEstimates.length > 0 &&
            availableEstimates.map((estimate) => {
              const isSelected = selectedEstimates.has(estimate)
              return (
                <button
                  key={estimate}
                  onClick={() => onToggleEstimate(estimate)}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-colors ${
                    isSelected
                      ? 'bg-green-600 text-white'
                      : 'border border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 16 16"
                    fill={isSelected ? 'currentColor' : 'lch(38.893% 1 282.863 / 1)'}
                    role="img"
                    focusable="false"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3.741 14.5h8.521c1.691 0 2.778-1.795 1.993-3.293l-4.26-8.134c-.842-1.608-3.144-1.608-3.986 0l-4.26 8.134C.962 12.705 2.05 14.5 3.74 14.5ZM8 3.368a.742.742 0 0 0-.663.402l-4.26 8.134A.75.75 0 0 0 3.741 13H8V3.367Z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{estimate}</span>
                  {isSelected && <X size={12} />}
                </button>
              )
            })}

          {/* Show Only With Votes Checkbox */}
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-gray-300 bg-white px-2.5 py-1 text-xs transition-colors hover:border-gray-400">
            <input
              type="checkbox"
              checked={showOnlyWithVotes}
              onChange={onToggleShowOnlyWithVotes}
              className="h-3.5 w-3.5 cursor-pointer rounded"
            />
            <span className="text-gray-700">With votes</span>
          </label>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter Results */}
          {isFiltered && (
            <div className="whitespace-nowrap text-xs text-gray-600">
              <span className="font-semibold text-gray-900">{filteredCount}</span>/
              <span className="font-semibold text-gray-900">{totalCount}</span>
            </div>
          )}

          {/* Clear Button */}
          {isFiltered && (
            <button
              onClick={onClearFilters}
              className="whitespace-nowrap text-xs font-medium text-blue-600 transition-colors hover:text-blue-800"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
