import type { Connection } from 'agents'

import type { ConnectionData } from '../types'
import type { ChannelRouter } from './channels/channel-router'
import type {
  AppWebSocketMessage,
  BaseWebSocketAgentOptions,
  ChannelDefinition,
  ChannelHandler,
} from './types'

export const WS_CONNECTING = 0
export const WS_OPEN = 1
export const WS_CLOSING = 2
export const WS_CLOSED = 3

export const ACTIVE_CONNECTIONS_KEY = '__ws_active_connections__'
export const PRIVATE_STATE_KEY = 'private_state'

export const PRESENCE_CHECK_BUFFER_MS = 30 * 1_000 // 30 seconds buffer after client's idle timeout
export const PRESENCE_CHECK_TIMEOUT_MS = 10 * 1_000 // 10 seconds to wait for client response
export const DEFAULT_CLIENT_IDLE_TIMEOUT = 2 * 60 * 1_000 // Default to 2 minutes if not provided by client
export const BROADCAST_DEBOUNCE_MS = 250
export const ALARM_INTERVAL_MS = 30 * 1_000 // 30 seconds - alarm fires after connections close to verify remaining connections

export type BaseWebSocketAgentWsOptions<
  TAgent = unknown,
  State = unknown,
> = Required<
  Omit<
    BaseWebSocketAgentOptions<TAgent>,
    'channelDefinitions' | 'getStateIdentifier'
  >
> & {
  channelDefinitions?: ChannelDefinition<TAgent>[]
  getStateIdentifier?: (state: State) => string | null
}

export interface BaseWebSocketAgentHost<
  Env extends Cloudflare.Env = Record<string, string>,
  State = unknown,
  PrivateState = Record<string, unknown>,
> {
  ctx: DurableObjectState
  state: State
  wsOptions: BaseWebSocketAgentWsOptions<
    BaseWebSocketAgentHost<Env, State, PrivateState>,
    State
  >
  channelRouter: ChannelRouter
  activeConnectionIds: Set<string>
  pendingPresenceChecks: Map<string, NodeJS.Timeout>
  broadcastDebounceTimer: NodeJS.Timeout | null

  readonly WS_OPEN: number
  readonly PRESENCE_CHECK_BUFFER_MS: number
  readonly PRESENCE_CHECK_TIMEOUT_MS: number
  readonly DEFAULT_CLIENT_IDLE_TIMEOUT: number
  readonly BROADCAST_DEBOUNCE_MS: number
  readonly ALARM_INTERVAL_MS: number
  readonly ACTIVE_CONNECTIONS_KEY: string
  readonly PRIVATE_STATE_KEY: string

  getDefaultPrivateState(): PrivateState
  getPrivateState(): PrivateState
  setPrivateState(state: PrivateState): void
  setState(state: State): Promise<void>
  onStateChanged(): void

  storeConnectionData(
    connection: Connection,
    data: ConnectionData,
  ): Promise<boolean>
  getConnectionData(connection: Connection | WebSocket): ConnectionData | null
  safeSend(connection: Connection | WebSocket, message: unknown): void
  saveActiveConnectionsToStorage(): Promise<void>
  loadActiveConnectionsFromStorage(): Promise<void>
  broadcastConnectedUsers(): Promise<void>
  broadcastToAll(message: unknown): Promise<void>
  broadcastToChannel<T = unknown>(
    channelName: string,
    action: string,
    payload?: T,
  ): Promise<void>
  updateIdleStatus(connection: Connection, isIdle: boolean): Promise<void>
  getConnectedUsers(): Promise<import('../types').ConnectedUser[]>
  closeDuplicateConnectionsByInstance(
    userId: string,
    clientInstanceId: string,
    currentConnection: Connection,
  ): Promise<void>
  handleStandardMessage(
    connection: Connection,
    data: import('../types').WebSocketMessage,
  ): Promise<boolean>
  handleChannelMessage(
    connection: Connection,
    message: import('./types').ChannelMessage,
  ): Promise<void>
  handleAppMessage(
    connection: Connection,
    data: AppWebSocketMessage,
  ): Promise<void>
  handleBinaryMessage?(connection: Connection, data: ArrayBuffer): Promise<void>
  canAccessChannel(
    connection: Connection | WebSocket,
    channelName: string,
  ): boolean
  registerChannel(channel: string, handler: ChannelHandler): void
  checkAndPingInactiveConnections(): Promise<void>
  aggressiveConnectionCheck(): Promise<void>
}
