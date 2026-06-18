import { createRequestHandler, RouterContextProvider } from 'react-router'
import { routeAgentRequest } from 'agents'
import {
  DotVotingSessionAgent,
  PropertyVotingSessionAgent,
  SystemAgent,
  TeamAgent,
  TimelineSessionAgent,
  UserAgent,
} from 'roadmaps-agents'

import { getActiveSessionUser } from '../app/auth/session.server'
import type { RequiredEnvVars } from '../env-required'

export {
  SystemAgent,
  UserAgent,
  TeamAgent,
  TimelineSessionAgent,
  DotVotingSessionAgent,
  PropertyVotingSessionAgent,
}

declare module 'react-router' {
  export interface AppLoadContext {
    env: RequiredEnvVars
    cloudflare: { env: RequiredEnvVars; ctx: ExecutionContext }
  }
}

const requestHandler = createRequestHandler(
  // @ts-expect-error virtual module provided at build time
  () => import('virtual:react-router/server-build'),
  import.meta.env.MODE,
)

export default {
  async fetch(request: Request, env: RequiredEnvVars, ctx: ExecutionContext) {
    const agentResponse = await routeAgentRequest(request, env, {
      onBeforeRequest: async (req: Request) => {
        const user = await getActiveSessionUser(req, env)
        if (!user) return new Response('Unauthorized', { status: 401 })
        return req
      },
      onBeforeConnect: async (req: Request) => {
        const user = await getActiveSessionUser(req, env)
        if (!user) return new Response('Unauthorized', { status: 401 })
        req.headers.set('x-user-id', user.email)
        const url = new URL(req.url)
        const clientInstanceId = url.searchParams.get('clientInstanceId')
        if (clientInstanceId) req.headers.set('x-metadata-client-instance-id', clientInstanceId)
        return req
      },
    }).catch(() => null)

    if (agentResponse) return agentResponse

    const loadContext = new RouterContextProvider()
    Object.assign(loadContext, { env, cloudflare: { env, ctx } })
    return requestHandler(request, loadContext)
  },
} satisfies ExportedHandler<RequiredEnvVars>
