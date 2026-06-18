import { useCallback, useEffect, useReducer, useRef } from 'react'
import { useFetcher } from 'react-router'

import type { LinearIssue } from '~/utils/linear.server'

type LinearImportState = {
  projectOpen: boolean
  labelOpen: boolean
  selectedIssues: Set<string>
  projectFilter: string
  labelFilter: string
  startDate: string
  endDate: string
  searchQuery: string
  collapseSubIssues: boolean
  importOption: 'skip' | 'overwrite'
  summarize: boolean
}

type LinearImportAction =
  | { type: 'setProjectOpen'; value: boolean }
  | { type: 'setLabelOpen'; value: boolean }
  | { type: 'setSelectedIssues'; value: Set<string> }
  | { type: 'setProjectFilter'; value: string }
  | { type: 'setLabelFilter'; value: string }
  | { type: 'setStartDate'; value: string }
  | { type: 'setEndDate'; value: string }
  | { type: 'setSearchQuery'; value: string }
  | { type: 'setCollapseSubIssues'; value: boolean }
  | { type: 'setImportOption'; value: 'skip' | 'overwrite' }
  | { type: 'setSummarize'; value: boolean }
  | { type: 'toggleIssue'; identifier: string }
  | { type: 'clearSelectedIssues' }

const initialState: LinearImportState = {
  projectOpen: false,
  labelOpen: false,
  selectedIssues: new Set(),
  projectFilter: '',
  labelFilter: '',
  startDate: '',
  endDate: '',
  searchQuery: '',
  collapseSubIssues: true,
  importOption: 'skip',
  summarize: true,
}

function linearImportReducer(state: LinearImportState, action: LinearImportAction): LinearImportState {
  switch (action.type) {
    case 'setProjectOpen':
      return { ...state, projectOpen: action.value }
    case 'setLabelOpen':
      return { ...state, labelOpen: action.value }
    case 'setSelectedIssues':
      return { ...state, selectedIssues: action.value }
    case 'setProjectFilter':
      return { ...state, projectFilter: action.value }
    case 'setLabelFilter':
      return { ...state, labelFilter: action.value }
    case 'setStartDate':
      return { ...state, startDate: action.value }
    case 'setEndDate':
      return { ...state, endDate: action.value }
    case 'setSearchQuery':
      return { ...state, searchQuery: action.value }
    case 'setCollapseSubIssues':
      return { ...state, collapseSubIssues: action.value }
    case 'setImportOption':
      return { ...state, importOption: action.value }
    case 'setSummarize':
      return { ...state, summarize: action.value }
    case 'toggleIssue': {
      const next = new Set(state.selectedIssues)
      if (next.has(action.identifier)) next.delete(action.identifier)
      else next.add(action.identifier)
      return { ...state, selectedIssues: next }
    }
    case 'clearSelectedIssues':
      return { ...state, selectedIssues: new Set() }
    default:
      return state
  }
}

export type UseLinearImportOptions = {
  onClose: () => void
  onImportComplete?: () => void
}

export function useLinearImport({ onClose, onImportComplete }: UseLinearImportOptions) {
  const [state, dispatch] = useReducer(linearImportReducer, initialState)
  const importStartedRef = useRef(false)

  const metadataFetcher = useFetcher<{
    projects?: Array<{ id: string; name: string }>
    labels?: Array<{ id: string; name: string; color: string }>
    error?: string
  }>()

  const fetchIssuesFetcher = useFetcher<{
    issues?: LinearIssue[]
    error?: string
  }>()

  const importFetcher = useFetcher<{
    ok: boolean
    imported?: number
    error?: string
  }>()

  const issues = fetchIssuesFetcher.data?.issues ?? []
  const projects = metadataFetcher.data?.projects ?? []
  const labels = metadataFetcher.data?.labels ?? []

  useEffect(() => {
    if (!metadataFetcher.data) {
      const formData = new FormData()
      formData.append('intent', 'fetch-linear-metadata')
      metadataFetcher.submit(formData, { method: 'post' })
    }
  }, [metadataFetcher.data, metadataFetcher.submit])

  const handleFetchIssues = useCallback(() => {
    const formData = new FormData()
    formData.append('intent', 'fetch-linear-issues')
    if (state.projectFilter) formData.append('projectId', state.projectFilter)
    if (state.labelFilter) formData.append('label', state.labelFilter)
    if (state.startDate) formData.append('startDate', state.startDate)
    if (state.endDate) formData.append('endDate', state.endDate)
    if (state.searchQuery) formData.append('searchQuery', state.searchQuery)

    fetchIssuesFetcher.submit(formData, { method: 'post' })
    dispatch({ type: 'clearSelectedIssues' })
  }, [
    state.projectFilter,
    state.labelFilter,
    state.startDate,
    state.endDate,
    state.searchQuery,
    fetchIssuesFetcher.submit,
  ])

  const selectableIssues = issues.filter((issue) => !(state.collapseSubIssues && issue.parent))
  const selectableIdentifiers = new Set(selectableIssues.map((issue) => issue.identifier))

  const handleToggleAll = useCallback(() => {
    if (state.selectedIssues.size === selectableIdentifiers.size) {
      dispatch({ type: 'clearSelectedIssues' })
      return
    }
    dispatch({
      type: 'setSelectedIssues',
      value: new Set(selectableIdentifiers),
    })
  }, [state.selectedIssues.size, selectableIdentifiers])

  const handleImport = useCallback(() => {
    const selectedIssuesList = issues.filter((issue) => state.selectedIssues.has(issue.identifier))

    const formData = new FormData()
    formData.append('intent', 'import-linear-issues')
    formData.append('issues', JSON.stringify(selectedIssuesList))
    formData.append('collapseSubIssues', state.collapseSubIssues.toString())
    formData.append('importOption', state.importOption)
    if (state.summarize) formData.append('summarize', 'true')

    importStartedRef.current = true
    importFetcher.submit(formData, { method: 'post' })
  }, [
    issues,
    state.selectedIssues,
    state.collapseSubIssues,
    state.importOption,
    state.summarize,
    importFetcher.submit,
  ])

  useEffect(() => {
    if (!importStartedRef.current || importFetcher.state !== 'idle' || !importFetcher.data?.ok) {
      return
    }

    importStartedRef.current = false
    dispatch({ type: 'clearSelectedIssues' })
    onImportComplete?.()
    onClose()
  }, [importFetcher.state, importFetcher.data, onImportComplete, onClose])

  const isLoading =
    metadataFetcher.state !== 'idle' || fetchIssuesFetcher.state !== 'idle' || importFetcher.state !== 'idle'

  const isFetchingIssues = fetchIssuesFetcher.state !== 'idle'
  const isImporting = importFetcher.state !== 'idle'

  return {
    state,
    dispatch,
    issues,
    projects,
    labels,
    selectableIssues,
    selectableIdentifiers,
    metadataFetcher,
    fetchIssuesFetcher,
    importFetcher,
    isLoading,
    isFetchingIssues,
    isImporting,
    handleFetchIssues,
    handleToggleAll,
    handleImport,
  }
}
