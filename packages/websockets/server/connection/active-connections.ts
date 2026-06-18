import type { BaseWebSocketAgentHost } from '../base-websocket-agent-host'

export async function loadActiveConnectionsFromStorageImpl<
  Env extends Cloudflare.Env,
  State,
  PrivateState,
>(host: BaseWebSocketAgentHost<Env, State, PrivateState>): Promise<void> {
  try {
    const stored = await host.ctx.storage.get<string[]>(
      host.ACTIVE_CONNECTIONS_KEY,
    )

    if (stored && Array.isArray(stored)) {
      host.activeConnectionIds = new Set(stored)
    }
  } catch (error) {
    console.error(
      `[BaseWebSocketAgent] Error loading active connections from storage:`,
      error,
    )
  }
}

export async function saveActiveConnectionsToStorageImpl<
  Env extends Cloudflare.Env,
  State,
  PrivateState,
>(host: BaseWebSocketAgentHost<Env, State, PrivateState>): Promise<void> {
  try {
    const connectionIds = Array.from(host.activeConnectionIds)
    await host.ctx.storage.put(host.ACTIVE_CONNECTIONS_KEY, connectionIds)
  } catch (error) {
    console.error(
      `[BaseWebSocketAgent] Error saving active connections to storage:`,
      error,
    )
  }
}
