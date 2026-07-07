import type { DotVotingSessionAgent, PropertyVotingSessionAgent, TimelineSessionAgent } from 'roadmaps-agents'

import type { RequiredEnvVars } from '../../env-required'
import { generateDescriptionFromContent } from '../utils/ai-provider'
import {
  fetchLinearIssues,
  fetchLinearLabels,
  fetchLinearProjects,
  filterExcludeSubIssues,
  getLinearApiKey,
  type LinearIssue,
  linearIssuesForLLM,
  linearIssueToMarkdownSimple,
} from '../utils/linear.server'
import { getSystemAgent } from './agents.server'

type SessionAgent = TimelineSessionAgent | DotVotingSessionAgent | PropertyVotingSessionAgent

type ItemWithExternalId = { uuid: string; externalId?: string | null }

async function assertLinearImportAccess(env: RequiredEnvVars, userEmail: string) {
  if (!env.LINEAR_API_KEY) return { error: 'Linear is not configured' as const }

  const system = await getSystemAgent(env)
  const user = await system.getUserByEmail(userEmail)
  if (!user.ok || !user.body) {
    return { error: 'Linear import is not enabled for your account' as const }
  }

  if (user.body.role === 'app_admin' && user.body.status === 'active') {
    return null
  }

  if (!user.body.linearImportEnabled) {
    return { error: 'Linear import is not enabled for your account' as const }
  }

  return null
}

export async function fetchLinearMetadata(env: RequiredEnvVars, userEmail: string) {
  const accessError = await assertLinearImportAccess(env, userEmail)
  if (accessError) return accessError

  try {
    const apiKey = getLinearApiKey(env)
    const [allProjects, allLabels] = await Promise.all([
      fetchLinearProjects({ apiKey, limit: 100 }),
      fetchLinearLabels({ apiKey, limit: 200 }),
    ])

    return {
      projects: allProjects.map((p) => ({ id: p.id, name: p.name })),
      labels: allLabels.map((l) => ({
        id: l.id,
        name: l.name,
        color: l.color,
      })),
    }
  } catch (error) {
    console.error('[LINEAR] Error fetching metadata:', error)
    return {
      error: error instanceof Error ? error.message : 'Failed to fetch Linear metadata',
    }
  }
}

export async function fetchLinearIssuesForImport(
  env: RequiredEnvVars,
  userEmail: string,
  filters: {
    projectId?: string
    label?: string
    startDate?: string
    endDate?: string
    searchQuery?: string
  },
) {
  const accessError = await assertLinearImportAccess(env, userEmail)
  if (accessError) return accessError

  try {
    const apiKey = getLinearApiKey(env)
    const startDate = filters.startDate ? new Date(filters.startDate) : undefined
    const endDate = filters.endDate ? new Date(filters.endDate) : undefined

    const issues = await fetchLinearIssues({
      apiKey,
      startDate,
      endDate,
      labels: filters.label ? [filters.label] : undefined,
      projectId: filters.projectId,
      searchQuery: filters.searchQuery,
    })

    return { issues }
  } catch (error) {
    console.error('[LINEAR] Error fetching issues:', error)
    return {
      error: error instanceof Error ? error.message : 'Failed to fetch Linear issues',
    }
  }
}

export async function importLinearIssuesToSession({
  env,
  agent,
  userEmail,
  issuesJson,
  collapseSubIssues,
  importOption,
  summarize,
}: {
  env: RequiredEnvVars
  agent: SessionAgent
  userEmail: string
  issuesJson: string
  collapseSubIssues: boolean
  importOption: 'skip' | 'overwrite'
  summarize: boolean
}) {
  const accessError = await assertLinearImportAccess(env, userEmail)
  if (accessError) return { ok: false as const, error: accessError.error }

  if (!env.LINEAR_API_KEY) return { ok: false as const, error: 'Linear is not configured' }

  try {
    const issues = JSON.parse(issuesJson) as LinearIssue[]
    const issuesToImport = collapseSubIssues ? filterExcludeSubIssues({ issues }) : issues

    const apiKey = getLinearApiKey(env)
    const linearLabels = await fetchLinearLabels({ apiKey, limit: 200 })
    const labelColorMap = new Map(linearLabels.map((label) => [label.name, label.color]))

    const existingResult = await (
      agent as {
        getAllItems: (args: { userId: string }) => Promise<{
          ok: boolean
          body?: ItemWithExternalId[]
        }>
      }
    ).getAllItems({ userId: userEmail })
    const existingItems = existingResult.ok ? (existingResult.body ?? []) : []
    const externalIdMap = new Map(
      existingItems.filter((item) => item.externalId).map((item) => [item.externalId as string, item]),
    )

    const llmIssues = linearIssuesForLLM(issuesToImport)
    let imported = 0

    for (let index = 0; index < issuesToImport.length; index++) {
      const issue = issuesToImport[index]
      const existingItem = externalIdMap.get(issue.identifier)

      if (existingItem && importOption === 'skip') continue

      const labels = issue.labels.map((labelName) => ({
        text: labelName,
        color: labelColorMap.get(labelName) ?? '#6B7280',
      }))

      const externalContent = linearIssueToMarkdownSimple(llmIssues[index])
      let description: string | undefined = issue.description

      if (summarize) {
        try {
          const summarized = await generateDescriptionFromContent({
            env,
            content: externalContent,
          })
          if (summarized) description = summarized
        } catch (error) {
          console.warn(`[AI] Failed to generate description for ${issue.identifier}:`, error)
        }
      }

      const payload = {
        title: issue.title,
        description,
        externalId: issue.identifier,
        estimate: issue.estimate ?? undefined,
        externalContent,
        labels: labels.length > 0 ? labels : undefined,
      }

      const result = existingItem
        ? await (
            agent as {
              updateItem: (args: {
                itemUuid: string
                title: string
                description?: string | null
                externalId?: string | null
                estimate?: number | null
                externalContent?: string | null
                labels?: { text: string; color: string }[]
                userId: string
              }) => ReturnType<TimelineSessionAgent['updateItem']>
            }
          ).updateItem({
            itemUuid: existingItem.uuid,
            userId: userEmail,
            ...payload,
          })
        : await (
            agent as {
              createItem: (args: {
                title: string
                description?: string | null
                userId: string
                externalId?: string
                estimate?: number
                externalContent?: string
                labels?: { text: string; color: string }[]
              }) => ReturnType<TimelineSessionAgent['createItem']>
            }
          ).createItem({
            ...payload,
            userId: userEmail,
          })

      if (!result.ok)
        return {
          ok: false as const,
          error: result.errors?.[0] ?? 'Import failed',
        }

      imported++
    }

    return { ok: true as const, imported }
  } catch (error) {
    console.error('[LINEAR] Error importing issues:', error)
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : 'Import failed',
    }
  }
}
