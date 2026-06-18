import type { Connection } from 'agents'

import type { SessionAgent } from './session-handlers'

type SessionAgentWithConnections = SessionAgent & {
  ctx: DurableObjectState
  safeSend: (connection: Connection | WebSocket, message: unknown) => void
}

export async function disconnectUserConnections(
  agent: SessionAgentWithConnections,
  userId: string,
  message = 'Forbidden',
) {
  for (const connection of agent.ctx.getWebSockets()) {
    const connectionData = agent.getConnectionData(connection)
    if (connectionData?.userId !== userId) continue

    try {
      if (connection.readyState !== WebSocket.OPEN) continue
    } catch {
      continue
    }

    agent.safeSend(
      connection,
      JSON.stringify({
        type: 'error',
        message,
      }),
    )
    ;(connection as Connection).close(1008, message)
  }
}
