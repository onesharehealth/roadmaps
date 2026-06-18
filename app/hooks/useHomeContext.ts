import { useFetcher, useSearchParams } from 'react-router'
import type { HomeContextKey } from 'roadmaps-agents/schemas'

type UseHomeContextArgs = {
  loaderContextKey: string
  loaderTeamId: string | null
}

export function useHomeContext({ loaderContextKey, loaderTeamId }: UseHomeContextArgs) {
  const [searchParams, setSearchParams] = useSearchParams()
  const fetcher = useFetcher()

  const contextKey = searchParams.get('context') ?? loaderContextKey
  const teamId = searchParams.get('teamId') ?? loaderTeamId

  function persistAndNavigate(context: HomeContextKey, nextTeamId: string | null) {
    const params: Record<string, string> = { context }
    if (context === 'team' && nextTeamId) params.teamId = nextTeamId
    setSearchParams(params)

    const formData = new FormData()
    formData.set('intent', 'set-home-context')
    formData.set('context', context)
    if (context === 'team' && nextTeamId) formData.set('teamId', nextTeamId)
    fetcher.submit(formData, { method: 'post' })
  }

  function selectDrafts() {
    persistAndNavigate('drafts', null)
  }

  function selectShared() {
    persistAndNavigate('shared', null)
  }

  function selectTeam(id: string) {
    persistAndNavigate('team', id)
  }

  return {
    contextKey,
    teamId,
    selectDrafts,
    selectShared,
    selectTeam,
  }
}
