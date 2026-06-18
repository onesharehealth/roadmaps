import type { RequiredEnvVars } from '../env-required'

declare module 'react-router' {
  export interface AppLoadContext {
    env: RequiredEnvVars
    cloudflare: {
      env: RequiredEnvVars
      ctx: ExecutionContext
    }
  }

  interface RouterContextProvider {
    cloudflare: {
      env: RequiredEnvVars
      ctx: ExecutionContext
    }
  }
}
