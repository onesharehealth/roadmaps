import type { Connection } from 'agents'

import type { ConnectionData } from '../../types'
import type { BaseWebSocketAgentHost } from '../base-websocket-agent-host'

export async function closeDuplicateConnectionsByInstanceImpl<
  Env extends Cloudflare.Env,
  State,
  PrivateState,
>(
  host: BaseWebSocketAgentHost<Env, State, PrivateState>,
  userId: string,
  clientInstanceId: string,
  currentConnection: Connection,
): Promise<void> {
  try {
    const allConnections = host.ctx.getWebSockets()
    const openConnections = allConnections.filter((c) => {
      try {
        return c.readyState === host.WS_OPEN
      } catch {
        return false
      }
    })

    // Find all connections with same userId AND clientInstanceId (excluding currentConnection)
    const duplicatesToClose = openConnections
      .map((c) => ({ c, data: host.getConnectionData(c) }))
      .filter(({ c, data }) => {
        // Exclude the current connection from being considered a duplicate
        if (c === currentConnection) {
          return false
        }

        // Match by userId
        if (data?.userId !== userId) {
          return false
        }

        // Match by clientInstanceId - this is the ONLY deduplication criteria
        if (data?.clientInstanceId !== clientInstanceId) {
          return false
        }

        // This is a duplicate - same user and same clientInstanceId
        return true
      })
      .filter(({ data }) => data !== null) as Array<{
      c: Connection
      data: ConnectionData
    }>

    if (duplicatesToClose.length === 0) {
      return
    }

    if (host.wsOptions.enableConnectionLogging) {
      console.log(
        `[BaseWebSocketAgent] Closing ${duplicatesToClose.length} duplicate connection(s) for user ${userId}, clientInstanceId: ${clientInstanceId}`,
      )
    }

    for (const { c, data } of duplicatesToClose) {
      try {
        // Remove from active connections BEFORE closing to prevent aggressive check from pinging it
        if (data.connectionId) {
          host.activeConnectionIds.delete(data.connectionId)
          // Clear any pending presence checks for this connection
          const timeout = host.pendingPresenceChecks.get(data.connectionId)
          if (timeout) {
            clearTimeout(timeout)
            host.pendingPresenceChecks.delete(data.connectionId)
          }
        }
        c.close(1000, 'Closing duplicate connection for client instance')
      } catch (error) {
        console.warn(
          '[BaseWebSocketAgent] Error closing duplicate connection:',
          error,
        )
      }
    }

    // Save the updated active connections after removing duplicates
    await host.saveActiveConnectionsToStorage()

    // After closing, rebroadcast connected users to reflect the updated list
    if (host.wsOptions.autoBroadcastConnectedUsers) {
      await host.broadcastConnectedUsers()
    }
  } catch (error) {
    console.warn(
      '[BaseWebSocketAgent] Error during duplicate connection cleanup:',
      error,
    )
  }
}
