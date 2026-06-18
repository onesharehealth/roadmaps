import type { Connection } from 'agents'

import type { ConnectionData } from '../../types'
import type { BaseWebSocketAgentHost } from '../base-websocket-agent-host'

export async function aggressiveConnectionCheckImpl<
  Env extends Cloudflare.Env,
  State,
  PrivateState,
>(host: BaseWebSocketAgentHost<Env, State, PrivateState>): Promise<void> {
  const allConnections = host.ctx.getWebSockets()
  let connectionsChanged = false

  const connectionDatas = allConnections
    .map((connection) => ({
      connection,
      data: host.getConnectionData(connection),
    }))
    .filter(({ data }) => data !== null) as {
    connection: Connection
    data: ConnectionData
  }[]

  for (const { connection, data } of connectionDatas) {
    const connectionId = data.connectionId

    // 1. Remove genuinely closed connections
    if (
      !data ||
      connection.readyState !== host.WS_OPEN ||
      !host.activeConnectionIds.has(connectionId)
    ) {
      if (host.activeConnectionIds.delete(connectionId)) {
        connectionsChanged = true
      }
      const timeout = host.pendingPresenceChecks.get(connectionId)
      if (timeout) {
        clearTimeout(timeout)
        host.pendingPresenceChecks.delete(connectionId)
      }
      continue
    }

    // 2. Skip if already checking this connection
    if (host.pendingPresenceChecks.has(connectionId)) {
      continue
    }

    // 3. Send immediate presence check to ALL connections (no inactivity threshold)
    // Double-check the connection is still open before sending
    if (connection.readyState !== host.WS_OPEN) {
      console.log(
        `[BaseWebSocketAgent] Skipping presence check for ${connectionId} - connection not open (readyState: ${connection.readyState})`,
      )
      if (host.activeConnectionIds.delete(connectionId)) {
        connectionsChanged = true
      }
      continue
    }

    host.safeSend(
      connection,
      JSON.stringify({ type: 'activity:presence-check-request' }),
    )

    // Set a short timeout to close the connection if no response
    const timeout = setTimeout(async () => {
      console.warn(
        `[BaseWebSocketAgent] Client ${connectionId} did not respond to aggressive presence check. Closing connection.`,
      )
      try {
        connection.close(1001, 'No presence check response')
      } catch (error) {
        console.error(
          `[BaseWebSocketAgent] Error closing connection ${connectionId} after aggressive check:`,
          error,
        )
      } finally {
        host.pendingPresenceChecks.delete(connectionId)
        if (host.activeConnectionIds.delete(connectionId)) {
          await host.saveActiveConnectionsToStorage()
          await host.broadcastConnectedUsers()
        }
      }
    }, host.PRESENCE_CHECK_TIMEOUT_MS)

    host.pendingPresenceChecks.set(connectionId, timeout)
  }

  if (connectionsChanged) {
    await host.saveActiveConnectionsToStorage()
    await host.broadcastConnectedUsers()
  }
}

export async function checkAndPingInactiveConnectionsImpl<
  Env extends Cloudflare.Env,
  State,
  PrivateState,
>(host: BaseWebSocketAgentHost<Env, State, PrivateState>): Promise<void> {
  const currentTime = Date.now()
  let connectionsChanged = false
  const allConnections = host.ctx.getWebSockets()

  const connectionDatas = allConnections
    .map((connection) => ({
      connection,
      data: host.getConnectionData(connection),
    }))
    .filter(({ data }) => data !== null) as {
    connection: Connection
    data: ConnectionData
  }[]

  for (const { connection, data } of connectionDatas) {
    const connectionId = data.connectionId

    // 1. Handle genuinely closed or invalid connections first
    if (
      !data ||
      connection.readyState !== host.WS_OPEN ||
      !host.activeConnectionIds.has(connectionId)
    ) {
      if (host.activeConnectionIds.delete(connectionId)) {
        connectionsChanged = true
      }
      // Clear any pending presence check for this connection
      const timeout = host.pendingPresenceChecks.get(connectionId)
      if (timeout) {
        clearTimeout(timeout)
        host.pendingPresenceChecks.delete(connectionId)
      }
      continue // Move to the next connection
    }

    const { lastActivityTimestamp, clientIdleTimeout } = data
    const inactivityThreshold =
      clientIdleTimeout + host.PRESENCE_CHECK_BUFFER_MS

    // 2. Only consider connections that have been inactive for long enough
    if (currentTime - lastActivityTimestamp > inactivityThreshold) {
      // If a presence check is already pending, don't send another one
      if (host.pendingPresenceChecks.has(connectionId)) {
        continue
      }

      // Optimistically mark as idle while verifying
      if (!data.isIdle) {
        // We use the specific update method which handles broadcasting
        // The broadcast is debounced so calling this in a loop is safe
        await host.updateIdleStatus(connection, true)
      }

      // Send presence check request to client
      host.safeSend(
        connection,
        JSON.stringify({ type: 'activity:presence-check-request' }),
      )

      // Set a timeout to close the connection if no response is received
      const timeout = setTimeout(async () => {
        console.warn(
          `[BaseWebSocketAgent] Client ${connectionId} did not respond to presence check. Closing connection.`,
        )
        try {
          connection.close(1001, 'No presence check response')
        } catch (error) {
          console.error(
            `[BaseWebSocketAgent] Error closing connection ${connectionId} after presence check timeout:`,
            error,
          )
        } finally {
          host.pendingPresenceChecks.delete(connectionId)
          if (host.activeConnectionIds.delete(connectionId)) {
            await host.saveActiveConnectionsToStorage()
            await host.broadcastConnectedUsers()
          }
        }
      }, host.PRESENCE_CHECK_TIMEOUT_MS)

      host.pendingPresenceChecks.set(connectionId, timeout)
    }
  }

  // 3. Perform storage save and broadcast only once if any changes occurred during the loop
  if (connectionsChanged) {
    await host.saveActiveConnectionsToStorage()
    await host.broadcastConnectedUsers()
  }
}
