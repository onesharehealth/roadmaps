import { LinearImportFilters } from './linear-import-filters'
import { LinearImportIssueList } from './linear-import-issue-list'
import { useLinearImport } from './use-linear-import'

type LinearImportFormProps = {
  existingExternalIds: Set<string>
  aiEnabled: boolean
  onClose: () => void
  onImportComplete?: () => void
}

export function LinearImportForm({
  existingExternalIds,
  aiEnabled,
  onClose,
  onImportComplete,
}: LinearImportFormProps) {
  const importState = useLinearImport({ onClose, onImportComplete })
  const { issues, metadataFetcher, fetchIssuesFetcher, importFetcher } = importState

  return (
    <div className="space-y-4">
      <LinearImportFilters importState={importState} aiEnabled={aiEnabled} />

      {metadataFetcher.data?.error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {metadataFetcher.data.error}
        </div>
      )}

      {fetchIssuesFetcher.data?.error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {fetchIssuesFetcher.data.error}
        </div>
      )}

      {importFetcher.data?.error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {importFetcher.data.error}
        </div>
      )}

      {importFetcher.data?.ok && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          Successfully imported {importFetcher.data.imported} issue(s)!
        </div>
      )}

      <LinearImportIssueList
        importState={importState}
        existingExternalIds={existingExternalIds}
        onClose={onClose}
      />

      {issues.length === 0 && (
        <div className="flex min-h-32 items-center justify-center rounded-md border border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-gray-600">
            {metadataFetcher.state !== 'idle' && !metadataFetcher.data
              ? 'Loading projects and labels...'
              : fetchIssuesFetcher.data && !fetchIssuesFetcher.data.error
                ? 'No issues found. Try adjusting your filters.'
                : 'Set your filters and click "Fetch Issues" to get started.'}
          </p>
        </div>
      )}
    </div>
  )
}
