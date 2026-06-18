import { Check } from 'lucide-react'

import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'
import type { LinearIssue } from '~/utils/linear.server'
import type { useLinearImport } from './use-linear-import'

type LinearImportIssueListProps = {
  importState: ReturnType<typeof useLinearImport>
  existingExternalIds: Set<string>
  onClose: () => void
}

export function LinearImportIssueList({ importState, existingExternalIds, onClose }: LinearImportIssueListProps) {
  const {
    state,
    dispatch,
    issues,
    selectableIssues,
    selectableIdentifiers,
    isLoading,
    isImporting,
    handleToggleAll,
    handleImport,
  } = importState

  if (issues.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">
          {state.collapseSubIssues
            ? `Found ${selectableIssues.length}/${issues.length} issue${issues.length !== 1 ? 's' : ''}`
            : `Found ${issues.length} issue${issues.length !== 1 ? 's' : ''}`}
        </h3>
        <Button onClick={handleToggleAll} variant="outline" size="sm" type="button">
          {state.selectedIssues.size === selectableIdentifiers.size ? 'Deselect All' : 'Select All'}
        </Button>
      </div>

      <div className="max-h-96 space-y-2 overflow-y-auto rounded-md border border-gray-200 bg-white p-3">
        {issues.map((issue) => (
          <LinearImportIssueCard
            key={issue.identifier}
            issue={issue}
            isSelected={state.selectedIssues.has(issue.identifier)}
            shouldExclude={state.collapseSubIssues && !!issue.parent}
            existingExternalIds={existingExternalIds}
            onToggle={() => dispatch({ type: 'toggleIssue', identifier: issue.identifier })}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-gray-200 pt-4">
        <div className="text-sm text-gray-600">
          {state.selectedIssues.size} of {selectableIdentifiers.size} issue
          {selectableIdentifiers.size !== 1 ? 's' : ''} selected
        </div>
        <div className="flex gap-2">
          <Button onClick={onClose} variant="outline" disabled={isLoading} type="button">
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={state.selectedIssues.size === 0 || isLoading} type="button">
            {isImporting ? 'Importing...' : `Import ${state.selectedIssues.size} Issue(s)`}
          </Button>
        </div>
      </div>
    </div>
  )
}

type LinearImportIssueCardProps = {
  issue: LinearIssue
  isSelected: boolean
  shouldExclude: boolean
  existingExternalIds: Set<string>
  onToggle: () => void
}

function LinearImportIssueCard({
  issue,
  isSelected,
  shouldExclude,
  existingExternalIds,
  onToggle,
}: LinearImportIssueCardProps) {
  const isSubIssue = !!issue.parent

  return (
    <button
      type="button"
      disabled={shouldExclude}
      onClick={onToggle}
      className={cn(
        'w-full rounded-md border p-3 text-left transition-colors',
        shouldExclude
          ? 'cursor-not-allowed border-gray-100 bg-gray-50 opacity-50'
          : isSelected
            ? 'cursor-pointer border-blue-500 bg-blue-50'
            : 'cursor-pointer border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          {shouldExclude ? (
            <div className="h-5 w-5 rounded border-2 border-gray-300" />
          ) : isSelected ? (
            <div className="flex h-5 w-5 items-center justify-center rounded bg-blue-500 text-white">
              <Check size={14} />
            </div>
          ) : (
            <div className="h-5 w-5 rounded border-2 border-gray-300" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-gray-500">{issue.identifier}</span>
            {existingExternalIds.has(issue.identifier) && (
              <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700">Already imported</span>
            )}
            {isSubIssue && issue.parent && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                Sub-issue of {issue.parent.title}
              </span>
            )}
            {issue.priority && issue.priority !== 'None' && (
              <span className="rounded bg-gray-200 px-1.5 py-0.5 text-xs text-gray-700">{issue.priority}</span>
            )}
            {issue.state && (
              <span className="rounded bg-gray-200 px-1.5 py-0.5 text-xs text-gray-700">{issue.state}</span>
            )}
          </div>
          <div className="mt-1 font-medium text-gray-900">{issue.title}</div>
          {issue.project && <div className="mt-1 text-xs text-gray-500">Project: {issue.project.name}</div>}
          {issue.labels.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {issue.labels.map((label) => (
                <span key={label} className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </button>
  )
}
