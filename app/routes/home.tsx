import { Link, redirect, useLoaderData } from 'react-router'
import type { HomeContextKey, SessionType } from 'roadmaps-agents/schemas'

import { CreateSessionOptions } from '~/components/home/CreateSessionOptions'
import { HomeShell } from '~/components/home/HomeShell'
import { SessionTileGrid } from '~/components/home/SessionTileGrid'
import { useHomeContext } from '~/hooks/useHomeContext'
import { getSessionAgent, getTeamAgent, getUserAgent } from '../data/agents.server'
import { deleteSessionForUser } from '../data/session-actions.server'
import { enrichAndSortSessionList, type SessionListEntry } from '../data/session-list.server'
import { requireTeamMember } from '../data/team-auth.server'
import { userContext } from '../middleware/auth'
import { defaultSessionName, sessionPath } from '../utils/sessions'
import type { Route } from './+types/home'

const homeContextTitles = {
  drafts: 'Drafts · Roadmaps',
  shared: 'Shared with me · Roadmaps',
  team: 'Team · Roadmaps',
} as const

export const meta: Route.MetaFunction = ({ location }) => {
  const contextKey = new URLSearchParams(location.search).get('context') ?? 'drafts'

  const title = homeContextTitles[contextKey as keyof typeof homeContextTitles] ?? 'Home · Roadmaps'

  return [{ title }]
}

export const loader = async ({ request, context }: Route.LoaderArgs) => {
  const user = context.get(userContext)

  const env = context.cloudflare.env

  const url = new URL(request.url)

  const urlContext = url.searchParams.get('context')
  const urlTeamId = url.searchParams.get('teamId')

  const userAgent = await getUserAgent(env, user.email)

  await userAgent.initializeUser(user.email)

  const dashboard = await userAgent.getDashboard()

  let contextKey: HomeContextKey = 'drafts'
  let teamId: string | null = null

  if (urlContext === 'drafts' || urlContext === 'shared' || urlContext === 'team') {
    contextKey = urlContext
    teamId = urlContext === 'team' ? urlTeamId : null
  } else {
    const homeContext = await userAgent.getHomeContext()
    if (homeContext.ok) {
      contextKey = homeContext.body.context
      teamId = homeContext.body.teamId
    }
  }

  if (!dashboard.ok)
    return {
      user,
      contextKey,
      teamId,
      personal: [],
      shared: [],
      teamIds: [],
      teams: [],
      teamSessions: [],
      teamName: null,
      teamIsAdmin: false,
      draftCount: 0,
      sharedCount: 0,
    }

  let teamSessions: Array<{
    uuid: string
    sessionType: SessionType
    name: string
    ownerEmail: string
  }> = []

  let teamName: string | null = null
  let teamIsAdmin = false

  const teams = await Promise.all(
    dashboard.body.teamIds.map(async (id) => {
      const team = await getTeamAgent(env, id)

      const teamData = await team.getTeamData()

      return {
        id,
        name: teamData.ok && teamData.body.name ? String(teamData.body.name) : id,
        sessionCount: teamData.ok ? teamData.body.sessions.length : 0,
      }
    }),
  )

  const draftCount = dashboard.body.personal.length
  const sharedCount = dashboard.body.shared.length

  if (contextKey === 'team' && (!teamId || !dashboard.body.teamIds.includes(teamId))) {
    const homeContext = await userAgent.getHomeContext()
    if (homeContext.ok) {
      contextKey = homeContext.body.context
      teamId = homeContext.body.teamId
    } else {
      contextKey = 'drafts'
      teamId = null
    }
  }

  if (contextKey === 'team' && teamId) {
    const team = await getTeamAgent(env, teamId)

    const teamData = await team.getTeamData()

    if (teamData.ok) {
      teamSessions = teamData.body.sessions as typeof teamSessions

      teamName = teamData.body.name ? String(teamData.body.name) : null
    }

    const role = await team.getMemberRole(user.email)
    teamIsAdmin = role === 'admin'
  }

  const toSessionListEntry = (session: {
    uuid: unknown
    sessionType: unknown
    name: unknown
    ownerEmail?: unknown
    createdAt?: unknown
    sharedAt?: unknown
  }): SessionListEntry => ({
    uuid: String(session.uuid),
    sessionType: session.sessionType as SessionType,
    name: String(session.name),
    ownerEmail: session.ownerEmail ? String(session.ownerEmail) : user.email,
    createdAt: typeof session.createdAt === 'number' ? session.createdAt : undefined,
    sharedAt: typeof session.sharedAt === 'number' ? session.sharedAt : undefined,
  })

  const [personalSessions, sharedSessions, enrichedTeamSessions] = await Promise.all([
    enrichAndSortSessionList({
      env,
      sessions: dashboard.body.personal.map(toSessionListEntry),
    }),
    enrichAndSortSessionList({
      env,
      sessions: dashboard.body.shared.map(toSessionListEntry),
    }),
    enrichAndSortSessionList({
      env,
      sessions: teamSessions.map(toSessionListEntry),
    }),
  ])

  return {
    user,

    contextKey,

    teamId,

    personal: personalSessions,

    shared: sharedSessions,

    teamIds: dashboard.body.teamIds,

    teams,

    teamSessions: enrichedTeamSessions,

    teamName,

    teamIsAdmin,

    draftCount,

    sharedCount,
  }
}

export const action = async ({ request, context }: Route.ActionArgs) => {
  const user = context.get(userContext)

  const env = context.cloudflare.env

  const formData = await request.formData()

  const intent = String(formData.get('intent'))

  if (intent === 'delete-session') {
    const uuid = String(formData.get('uuid'))
    const sessionType = String(formData.get('sessionType')) as SessionType

    await deleteSessionForUser({ env, user, uuid, sessionType })
    return redirect('/')
  }

  if (intent === 'set-home-context') {
    const homeContext = String(formData.get('context')) as HomeContextKey
    const teamId = formData.get('teamId') ? String(formData.get('teamId')) : null
    const userAgent = await getUserAgent(env, user.email)

    await userAgent.initializeUser(user.email)
    await userAgent.setHomeContext({ context: homeContext, teamId })

    return null
  }

  if (intent === 'create-team') {
    const name = String(formData.get('name')).trim()
    if (!name) throw new Response('Team name is required', { status: 400 })

    const teamId = crypto.randomUUID()
    const team = await getTeamAgent(env, teamId)

    await team.initializeTeam({ teamId, name, createdBy: user.email })

    const userAgent = await getUserAgent(env, user.email)
    await userAgent.initializeUser(user.email)
    await userAgent.setHomeContext({ context: 'team', teamId })

    throw redirect(`/?context=team&teamId=${teamId}`)
  }

  const sessionType = String(formData.get('sessionType')) as SessionType

  const name = defaultSessionName(sessionType)

  const contextKey = String(formData.get('contextKey') ?? 'drafts')

  const teamId = formData.get('teamId') ? String(formData.get('teamId')) : null

  const uuid = crypto.randomUUID()

  const agent = await getSessionAgent(env, sessionType, uuid)

  const initResult = await agent.initializeSession({
    uuid,

    name,

    sessionType,

    ownerEmail: user.email,

    teamId: contextKey === 'team' ? teamId : null,
  })

  if (!initResult.ok) {
    throw new Response(initResult.errors[0] ?? 'Failed to create session', {
      status: 500,
    })
  }

  const userAgent = await getUserAgent(env, user.email)

  if (contextKey === 'team' && teamId) {
    await requireTeamMember({ env, teamId, userId: user.email })
    const team = await getTeamAgent(env, teamId)

    await team.addTeamSession({
      uuid,
      sessionType,
      name,
      ownerEmail: user.email,
    })
  } else {
    await userAgent.addPersonalSession({ uuid, sessionType, name })
  }

  throw redirect(sessionPath(sessionType, uuid))
}

export default function HomePage() {
  const data = useLoaderData<typeof loader>()

  const { contextKey, teamId, selectDrafts, selectShared, selectTeam } = useHomeContext({
    loaderContextKey: data.contextKey,
    loaderTeamId: data.teamId,
  })

  const sessions =
    contextKey === 'shared' ? data.shared : contextKey === 'team' ? data.teamSessions : data.personal

  const pageTitle =
    contextKey === 'drafts' ? 'Drafts' : contextKey === 'shared' ? 'Shared with me' : (data.teamName ?? 'Team')

  const contextLabel =
    contextKey === 'drafts' ? 'Drafts' : contextKey === 'shared' ? 'Shared with me' : (data.teamName ?? 'Team')

  return (
    <HomeShell
      contextKey={contextKey}
      teamId={teamId}
      teams={data.teams}
      draftCount={data.draftCount}
      sharedCount={data.sharedCount}
      userEmail={data.user.email}
      userRole={data.user.role}
      contextLabel={contextLabel}
      onSelectDrafts={selectDrafts}
      onSelectShared={selectShared}
      onSelectTeam={selectTeam}
    >
      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold sm:text-2xl">{pageTitle}</h1>

          {contextKey === 'team' && teamId && (
            <p className="mt-2 text-sm">
              <Link to={`/teams/${teamId}`} className="text-primary font-medium hover:text-blue-700">
                {data.teamIsAdmin ? 'Manage members' : 'Members'}
              </Link>
            </p>
          )}
        </div>

        <CreateSessionOptions contextKey={contextKey} teamId={teamId} />
      </div>

      <section>
        <h2 className="text-muted-foreground mb-4 text-sm font-medium">
          {contextKey === 'shared' ? 'Shared sessions' : 'Sessions'}
        </h2>

        <SessionTileGrid
          sessions={sessions}
          showActions={contextKey !== 'shared'}
          currentUserEmail={data.user.email}
          currentTeamId={contextKey === 'team' ? teamId : null}
          currentTeamName={contextKey === 'team' ? data.teamName : null}
          teams={data.teams}
        />
      </section>
    </HomeShell>
  )
}
