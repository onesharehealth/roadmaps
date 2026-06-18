import { LinearClient } from '@linear/sdk'

import type { RequiredEnvVars } from '../../env-required'

const metadataCache = {
  projects: null as { data: LinearProject[]; timestamp: number } | null,
  labels: null as { data: LinearLabel[]; timestamp: number } | null,
}

const CACHE_TTL = 5 * 60 * 1000
const BASE_FETCH_LIMIT = 200

export interface LinearIssue {
  identifier: string
  title: string
  priority: string
  state: string
  triageDate?: string
  url: string
  description?: string
  createdAt: string
  completedAt?: string
  startedAt?: string
  triagedAt?: string
  dueDate?: string
  addedToCycleAt?: string
  addedToProjectAt?: string
  estimate?: number
  integrationSourceType?: string
  labels: string[]
  parent?: {
    id: string
    title: string
  }
  cycle?: {
    id: string
    name: string
    number: number
  }
  project?: {
    id: string
    name: string
    slugId: string
    description?: string
    color?: string
  }
  assignee?: {
    id: string
    name: string
    displayName: string
    email: string
    active: boolean
  }
  creator?: {
    id: string
    name: string
    displayName: string
    email: string
    active: boolean
  }
  comments?: Array<{
    id: string
    body: string
    createdAt: string
    user?: string
  }>
  history?: Array<{
    id: string
    createdAt: string
    fromState?: string
    toState?: string
    actor?: string
  }>
}

export interface LinearProject {
  id: string
  name: string
  slugId: string
  description?: string
  color?: string
}

export interface LinearLabel {
  id: string
  name: string
  color: string
  description?: string
  isGroup: boolean
}

export interface LinearIssueForLLM {
  identifier: string
  title: string
  priority: string
  state: string
  triageDate?: string
  url: string
  description?: string
  createdAt: string
  completedAt?: string
  startedAt?: string
  triagedAt?: string
  dueDate?: string
  addedToCycleAt?: string
  addedToProjectAt?: string
  estimate?: number
  integrationSourceType?: string
  labels: string[]
  cycle?: {
    name: string
    number: number
  }
  project?: {
    name: string
    description?: string
  }
  assignee?: {
    name: string
    displayName: string
  }
  creator?: {
    name: string
    displayName: string
  }
  comments?: Array<{
    body: string
    createdAt: string
    user?: string
  }>
  history?: Array<{
    createdAt: string
    fromState?: string
    toState?: string
    actor?: string
  }>
}

export interface FetchIssuesOptions {
  apiKey: string
  startDate?: Date
  endDate?: Date
  limit?: number
  searchQuery?: string
  labels?: string | string[]
  projectId?: string
}

function getLinearClient(apiKey: string): LinearClient {
  return new LinearClient({ apiKey })
}

export function getLinearApiKey(env: RequiredEnvVars) {
  if (!env.LINEAR_API_KEY) throw new Error('LINEAR_API_KEY is not configured')
  return env.LINEAR_API_KEY
}

export async function fetchLinearProjects({
  apiKey,
  limit = 50,
}: {
  apiKey: string
  limit?: number
}): Promise<LinearProject[]> {
  if (
    metadataCache.projects &&
    Date.now() - metadataCache.projects.timestamp < CACHE_TTL
  )
    return metadataCache.projects.data

  const query = `
    query GetProjects($first: Int!) {
      projects(first: $first) {
        nodes {
          id
          name
          slugId
          description
          color
        }
      }
    }
  `

  const client = getLinearClient(apiKey)
  const response = await client.client.rawRequest(query, { first: limit })
  const projects = (response.data as { projects: { nodes: LinearProject[] } })
    .projects.nodes
  projects.sort((a, b) => a.name.localeCompare(b.name))

  metadataCache.projects = { data: projects, timestamp: Date.now() }
  return projects
}

export async function fetchLinearLabels({
  apiKey,
  limit = 100,
}: {
  apiKey: string
  limit?: number
}): Promise<LinearLabel[]> {
  if (
    metadataCache.labels &&
    Date.now() - metadataCache.labels.timestamp < CACHE_TTL
  )
    return metadataCache.labels.data

  const query = `
    query GetLabels($first: Int!) {
      issueLabels(first: $first) {
        nodes {
          id
          name
          color
          description
          isGroup
        }
      }
    }
  `

  const client = getLinearClient(apiKey)
  const response = await client.client.rawRequest(query, { first: limit })
  const labels = (response.data as { issueLabels: { nodes: LinearLabel[] } })
    .issueLabels.nodes
  labels.sort((a, b) => a.name.localeCompare(b.name))

  metadataCache.labels = { data: labels, timestamp: Date.now() }
  return labels
}

export async function fetchLinearIssues(
  options: FetchIssuesOptions,
): Promise<LinearIssue[]> {
  const {
    apiKey,
    startDate,
    endDate,
    limit = BASE_FETCH_LIMIT,
    searchQuery,
    labels,
    projectId,
  } = options

  if (!apiKey) throw new Error('Linear API key is required')

  const filterParts: string[] = []

  if (startDate && endDate) {
    filterParts.push('updatedAt: { gte: $updatedAtGte, lte: $updatedAtLte }')
  } else if (startDate) {
    filterParts.push('updatedAt: { gte: $updatedAtGte }')
  } else if (endDate) {
    filterParts.push('updatedAt: { lte: $updatedAtLte }')
  }

  if (searchQuery?.trim()) {
    const escapedQuery = searchQuery.trim().replace(/"/g, '\\"')
    filterParts.push(`or: [
      { title: { contains: "${escapedQuery}" } },
      { description: { contains: "${escapedQuery}" } }
    ]`)
  }

  if (labels) {
    const labelArray = Array.isArray(labels) ? labels : [labels]
    const labelList = labelArray
      .map((l) => `"${l.replace(/"/g, '\\"')}"`)
      .join(', ')
    filterParts.push(`labels: { some: { name: { in: [${labelList}] } } }`)
  }

  if (projectId?.trim()) {
    const escapedProjectId = projectId.trim().replace(/"/g, '\\"')
    filterParts.push(`project: { id: { eq: "${escapedProjectId}" } }`)
  }

  const filterString =
    filterParts.length > 0 ? `{ ${filterParts.join(', ')} }` : '{}'
  const queryVariables: string[] = ['$first: Int!']
  const queryArgs: Record<string, string | number> = { first: limit }

  if (startDate && endDate) {
    queryVariables.push(
      '$updatedAtGte: DateTimeOrDuration!',
      '$updatedAtLte: DateTimeOrDuration!',
    )
    queryArgs.updatedAtGte = startDate.toISOString()
    queryArgs.updatedAtLte = endDate.toISOString()
  } else if (startDate) {
    queryVariables.push('$updatedAtGte: DateTimeOrDuration!')
    queryArgs.updatedAtGte = startDate.toISOString()
  } else if (endDate) {
    queryVariables.push('$updatedAtLte: DateTimeOrDuration!')
    queryArgs.updatedAtLte = endDate.toISOString()
  }

  const query = `
    query GetIssuesWithAllData(${queryVariables.join(', ')}) {
      issues(
        filter: ${filterString}
        orderBy: updatedAt
        first: $first
      ) {
        nodes {
          id
          identifier
          title
          description
          priority
          priorityLabel
          url
          createdAt
          updatedAt
          completedAt
          startedAt
          triagedAt
          dueDate
          addedToCycleAt
          addedToProjectAt
          estimate
          integrationSourceType
          parent {
            id
            title
          }
          creator {
            id
            name
            displayName
            email
            active
          }
          state {
            id
            name
            color
            type
          }
          project {
            id
            name
            slugId
            description
            color
          }
          cycle {
            id
            name
            number
          }
          assignee {
            id
            name
            displayName
            email
            active
          }
          labels {
            nodes {
              id
              name
              color
            }
          }
          history {
            nodes {
              id
              createdAt
              fromState {
                id
                name
              }
              toState {
                id
                name
              }
              actor {
                id
                name
                email
              }
            }
          }
          comments {
            nodes {
              id
              body
              createdAt
              user {
                id
                name
                email
              }
            }
          }
        }
      }
    }
  `

  const client = getLinearClient(apiKey)
  const response = await client.client.rawRequest(query, queryArgs)
  const issues = (response.data as { issues: { nodes: unknown[] } }).issues
    .nodes

  if (issues.length === 0) return []

  return issues.map((issue: unknown) => {
    const i = issue as {
      identifier: string
      title: string
      priorityLabel: string
      state?: { name: string }
      parent?: { id: string; title: string }
      project?: {
        id: string
        name: string
        slugId: string
        description?: string
        color?: string
      }
      cycle?: { id: string; name: string; number: number }
      assignee?: {
        id: string
        name: string
        displayName: string
        email: string
        active: boolean
      }
      creator?: {
        id: string
        name: string
        displayName: string
        email: string
        active: boolean
      }
      url: string
      description?: string
      createdAt: string
      completedAt?: string
      startedAt?: string
      triagedAt?: string
      dueDate?: string
      addedToCycleAt?: string
      addedToProjectAt?: string
      estimate?: number
      integrationSourceType?: string
      labels?: { nodes?: { name: string }[] }
      comments?: {
        nodes?: {
          id: string
          body: string
          createdAt: string
          user?: { name?: string; email?: string }
        }[]
      }
      history?: {
        nodes?: {
          id: string
          createdAt: string
          fromState?: { name: string }
          toState?: { name: string }
          actor?: { name?: string; email?: string }
        }[]
      }
    }

    const processedComments =
      i.comments?.nodes?.map((comment) => ({
        id: comment.id,
        body: comment.body,
        createdAt: comment.createdAt,
        user: comment.user?.name || comment.user?.email || 'Unknown',
      })) || []

    const processedHistory =
      i.history?.nodes?.map((historyItem) => ({
        id: historyItem.id,
        createdAt: historyItem.createdAt,
        fromState: historyItem.fromState?.name,
        toState: historyItem.toState?.name,
        actor: historyItem.actor?.name || historyItem.actor?.email || 'Unknown',
      })) || []

    return {
      identifier: i.identifier,
      title: i.title,
      priority: i.priorityLabel || 'None',
      state: i.state?.name || 'Unknown',
      parent: i.parent ? { id: i.parent.id, title: i.parent.title } : undefined,
      project: i.project
        ? {
            id: i.project.id,
            name: i.project.name,
            slugId: i.project.slugId,
            description: i.project.description,
            color: i.project.color,
          }
        : undefined,
      cycle: i.cycle
        ? { id: i.cycle.id, name: i.cycle.name, number: i.cycle.number }
        : undefined,
      assignee: i.assignee
        ? {
            id: i.assignee.id,
            name: i.assignee.name,
            displayName: i.assignee.displayName,
            email: i.assignee.email,
            active: i.assignee.active,
          }
        : undefined,
      creator: i.creator
        ? {
            id: i.creator.id,
            name: i.creator.name,
            displayName: i.creator.displayName,
            email: i.creator.email,
            active: i.creator.active,
          }
        : undefined,
      url: i.url,
      description: i.description || undefined,
      createdAt: i.createdAt,
      completedAt: i.completedAt,
      startedAt: i.startedAt,
      triagedAt: i.triagedAt,
      dueDate: i.dueDate,
      addedToCycleAt: i.addedToCycleAt,
      addedToProjectAt: i.addedToProjectAt,
      estimate: i.estimate,
      integrationSourceType: i.integrationSourceType,
      labels: i.labels?.nodes?.map((label) => label.name) || [],
      comments: processedComments.length > 0 ? processedComments : undefined,
      history: processedHistory.length > 0 ? processedHistory : undefined,
    }
  })
}

export function filterExcludeSubIssues({
  issues,
}: {
  issues: LinearIssue[]
}): LinearIssue[] {
  return issues.filter((issue) => !issue.parent)
}

export function linearIssuesForLLM(issues: LinearIssue[]): LinearIssueForLLM[] {
  return issues.map((issue) => {
    const simplifiedIssue: LinearIssueForLLM = {
      identifier: issue.identifier,
      title: issue.title,
      priority: issue.priority,
      state: issue.state,
      url: issue.url,
      description: issue.description,
      createdAt: issue.createdAt,
      completedAt: issue.completedAt,
      startedAt: issue.startedAt,
      triagedAt: issue.triagedAt,
      dueDate: issue.dueDate,
      addedToCycleAt: issue.addedToCycleAt,
      addedToProjectAt: issue.addedToProjectAt,
      estimate: issue.estimate,
      integrationSourceType: issue.integrationSourceType,
      labels: issue.labels,
      triageDate: issue.triageDate,
    }

    if (issue.cycle) {
      simplifiedIssue.cycle = {
        name: issue.cycle.name,
        number: issue.cycle.number,
      }
    }

    if (issue.project) {
      simplifiedIssue.project = {
        name: issue.project.name,
        description: issue.project.description,
      }
    }

    if (issue.assignee) {
      simplifiedIssue.assignee = {
        name: issue.assignee.name,
        displayName: issue.assignee.displayName,
      }
    }

    if (issue.creator) {
      simplifiedIssue.creator = {
        name: issue.creator.name,
        displayName: issue.creator.displayName,
      }
    }

    if (issue.comments?.length) {
      simplifiedIssue.comments = issue.comments.map((comment) => ({
        body: comment.body,
        createdAt: comment.createdAt,
        user: comment.user,
      }))
    }

    if (issue.history?.length) {
      simplifiedIssue.history = issue.history.map((historyItem) => ({
        createdAt: historyItem.createdAt,
        fromState: historyItem.fromState,
        toState: historyItem.toState,
        actor: historyItem.actor,
      }))
    }

    return simplifiedIssue
  })
}

export function linearIssueToMarkdownSimple(issue: LinearIssueForLLM): string {
  const lines: string[] = []

  if (issue.project || issue.cycle) {
    const contextInfo: string[] = []
    if (issue.project) contextInfo.push(`**Project:** ${issue.project.name}`)
    if (issue.cycle)
      contextInfo.push(
        `**Cycle:** ${issue.cycle.name} (#${issue.cycle.number})`,
      )
    lines.push(contextInfo.join(' | '))
    lines.push('')
  }

  if (issue.labels.length > 0) {
    lines.push(`**Labels:** ${issue.labels.join(', ')}`)
    lines.push('')
  }

  if (issue.description) {
    lines.push('**Description:**')
    lines.push(issue.description)
    lines.push('')
  }

  const dates: string[] = []
  if (issue.createdAt)
    dates.push(
      `Created: ${formatDate(new Date(issue.createdAt), 'MMM DD, YYYY')}`,
    )
  if (issue.startedAt)
    dates.push(
      `Started: ${formatDate(new Date(issue.startedAt), 'MMM DD, YYYY')}`,
    )
  if (issue.completedAt)
    dates.push(
      `Completed: ${formatDate(new Date(issue.completedAt), 'MMM DD, YYYY')}`,
    )
  if (issue.dueDate)
    dates.push(`Due: ${formatDate(new Date(issue.dueDate), 'MMM DD, YYYY')}`)
  if (dates.length > 0) {
    lines.push(`**Timeline:** ${dates.join(' • ')}`)
    lines.push('')
  }

  if (issue.comments?.length) {
    lines.push(`**Comments (${issue.comments.length}):**`)
    issue.comments.forEach((comment) => {
      const date = formatDate(new Date(comment.createdAt), 'MMM DD, YYYY')
      lines.push(`- *${comment.user}* (${date}): ${comment.body}`)
    })
    lines.push('')
  }

  lines.push('')
  return lines.join('\n')
}

function formatDate(date: Date, format: string): string {
  const month = date.toLocaleString('en-US', { month: 'short' })
  const day = date.getDate()
  const year = date.getFullYear()

  switch (format) {
    case 'MMM DD':
      return `${month} ${day}`
    case 'MMM DD, YYYY':
      return `${month} ${day}, ${year}`
    default:
      return date.toISOString()
  }
}
