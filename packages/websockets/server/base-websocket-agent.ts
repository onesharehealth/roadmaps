/// <reference types="@cloudflare/workers-types" />

import { Agent, Connection, ConnectionContext, WSMessage } from 'agents'

import type { ConnectedUser, ConnectionData } from '../types'
import type { WebSocketMessage } from '../types'
import {
  broadcastToAllImpl,
  broadcastToChannelImpl,
  broadcastToUserImpl,
  canAccessChannelImpl,
  safeSendImpl,
} from './broadcast/broadcast'
import {
  broadcastConnectedUsersImpl,
  getConnectedUsersImpl,
} from './broadcast/connected-users'
import { ChannelRouter } from './channels/channel-router'
import { registerChannelsImpl } from './channels/register-channels'
import {
  loadActiveConnectionsFromStorageImpl,
  saveActiveConnectionsToStorageImpl,
} from './connection/active-connections'
import {
  getConnectionDataImpl,
  storeConnectionDataImpl,
} from './connection/connection-data'
import { closeDuplicateConnectionsByInstanceImpl } from './connection/duplicate-connections'
import { onCloseImpl } from './connection/on-close'
import { onConnectImpl } from './connection/on-connect'
import { handleChannelMessageImpl } from './messaging/channel-messages'
import { onMessageImpl } from './messaging/on-message'
import { handleStandardMessageImpl } from './messaging/standard-messages'
import { updateIdleStatusImpl } from './presence/idle-status'
import {
  aggressiveConnectionCheckImpl,
  checkAndPingInactiveConnectionsImpl,
} from './presence/presence-check'
import {
  getPrivateStateImpl,
  setPrivateStateImpl,
  setPrivateStatePartialImpl,
  setPublicStatePartialImpl,
} from './state/private-state'
import {
  ACTIVE_CONNECTIONS_KEY,
  ALARM_INTERVAL_MS,
  type BaseWebSocketAgentHost,
  type BaseWebSocketAgentWsOptions,
  BROADCAST_DEBOUNCE_MS,
  DEFAULT_CLIENT_IDLE_TIMEOUT,
  PRESENCE_CHECK_BUFFER_MS,
  PRESENCE_CHECK_TIMEOUT_MS,
  PRIVATE_STATE_KEY,
  WS_CLOSED,
  WS_CLOSING,
  WS_CONNECTING,
  WS_OPEN,
} from './base-websocket-agent-host'
import { bindHandlersToPrototype } from './bind-handlers-to-prototype'
import type {
  AppWebSocketMessage,
  BaseWebSocketAgentOptions,
  ChannelDefinition,
  ChannelHandler,
  WebSocketConnectionManager,
} from './types'
import type { ChannelMessage } from './types'

/**
 * Base WebSocket Agent class that provides common websocket functionality
 *
 * This class extends the base Agent and provides:
 * - Automatic connection management
 * - User tracking and idle status
 * - Broadcasting utilities
 * - Standardized message handling patterns
 * - State management helpers (Public & Private)
 */
export abstract class BaseWebSocketAgent<
    Env extends Cloudflare.Env = Record<string, string>,
    State = unknown,
    PrivateState = Record<string, unknown>,
  >
  extends Agent<Env, State>
  implements WebSocketConnectionManager
{
  protected wsOptions: BaseWebSocketAgentWsOptions<
    BaseWebSocketAgent<Env, State, PrivateState>,
    State
  >
  protected channelRouter: ChannelRouter
  // In-memory cache of active connection IDs for fast access
  private activeConnectionIds: Set<string> = new Set()
  // Storage key for persisting active connection IDs across hibernation
  private readonly ACTIVE_CONNECTIONS_KEY = ACTIVE_CONNECTIONS_KEY
  // Storage key for private state in Synchronous KV
  protected readonly PRIVATE_STATE_KEY = PRIVATE_STATE_KEY

  // WebSocket readyState constants for convenience and clarity
  protected readonly WS_CONNECTING = WS_CONNECTING
  protected readonly WS_OPEN = WS_OPEN
  protected readonly WS_CLOSING = WS_CLOSING
  protected readonly WS_CLOSED = WS_CLOSED

  // New constants for presence tracking
  private readonly PRESENCE_CHECK_BUFFER_MS = PRESENCE_CHECK_BUFFER_MS
  private readonly PRESENCE_CHECK_TIMEOUT_MS = PRESENCE_CHECK_TIMEOUT_MS
  private readonly DEFAULT_CLIENT_IDLE_TIMEOUT = DEFAULT_CLIENT_IDLE_TIMEOUT

  // In-memory map to track pending presence check pings
  private pendingPresenceChecks: Map<string, NodeJS.Timeout> = new Map()

  // Debounce timer for broadcasting connected users
  private broadcastDebounceTimer: NodeJS.Timeout | null = null
  private readonly BROADCAST_DEBOUNCE_MS = BROADCAST_DEBOUNCE_MS
  private readonly ALARM_INTERVAL_MS = ALARM_INTERVAL_MS

  private host(): BaseWebSocketAgentHost<Env, State, PrivateState> {
    return this as unknown as BaseWebSocketAgentHost<Env, State, PrivateState>
  }

  constructor(
    state: unknown,
    env: Env,
    options: BaseWebSocketAgentOptions = {},
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    super(state as any, env)
    this.wsOptions = {
      maxAttachmentAttempts: 3,
      autoBroadcastConnectedUsers: true,
      enableConnectionLogging: process.env.WS_DEBUG === 'true',
      ...options,
    }

    // Initialize channel router with test channel
    this.channelRouter = new ChannelRouter()
    this.registerChannels()

    // Load active connection IDs from persistent storage (survives hibernation)
    // Use blockConcurrencyWhile to ensure this completes before handling any requests
    this.ctx.blockConcurrencyWhile(async () => {
      await this.loadActiveConnectionsFromStorage()
    })

    // Chain alarm: Agent sets this.alarm to execute scheduled tasks (cf_agents_schedules).
    // We must also run our connection cleanup. Run schedule executor first, then our check.
    const scheduleAlarm = this.alarm
    ;(this as { alarm: () => Promise<void> }).alarm = async () => {
      await scheduleAlarm?.()
      await this.checkAndPingInactiveConnections()
    }
  }

  protected abstract getDefaultPrivateState(): PrivateState

  protected getPrivateState(): PrivateState {
    return getPrivateStateImpl(this.host())
  }

  protected setPrivateState(state: PrivateState): void {
    setPrivateStateImpl(this.host(), state)
  }

  protected setPrivateStatePartial(state: Partial<PrivateState>): void {
    setPrivateStatePartialImpl(this.host(), state)
  }

  protected async setPublicStatePartial(state: Partial<State>): Promise<void> {
    return setPublicStatePartialImpl(this.host(), state)
  }

  protected safeSend(
    connection: Connection | WebSocket,
    message: unknown,
  ): void {
    safeSendImpl(this.host(), connection, message)
  }

  protected async loadActiveConnectionsFromStorage(): Promise<void> {
    return loadActiveConnectionsFromStorageImpl(this.host())
  }

  private async saveActiveConnectionsToStorage(): Promise<void> {
    return saveActiveConnectionsToStorageImpl(this.host())
  }

  protected registerChannels(): void {
    registerChannelsImpl(this.host())
  }

  async onConnect(
    connection: Connection,
    ctx: ConnectionContext,
  ): Promise<void> {
    return onConnectImpl(this.host(), connection, ctx)
  }

  async onClose(
    connection: Connection,
    code: number,
    reason: string,
    wasClean: boolean,
  ): Promise<void> {
    return onCloseImpl(this.host(), connection, code, reason, wasClean)
  }

  async onMessage(connection: Connection, message: WSMessage): Promise<void> {
    return onMessageImpl(this.host(), connection, message)
  }

  protected async handleStandardMessage(
    connection: Connection,
    data: WebSocketMessage,
  ): Promise<boolean> {
    return handleStandardMessageImpl(this.host(), connection, data)
  }

  protected async handleChannelMessage(
    connection: Connection,
    message: ChannelMessage,
  ): Promise<void> {
    return handleChannelMessageImpl(this.host(), connection, message)
  }

  protected registerChannel(channel: string, handler: ChannelHandler): void {
    this.channelRouter.register(channel, handler)
  }

  protected getRegisteredChannels(): string[] {
    return this.channelRouter.getRegisteredChannels()
  }

  onStateUpdate(_state: State, _source: Connection | 'server'): void {
    this.onStateChanged()
  }

  protected onStateChanged(): void {
    this.registerChannels()
  }

  async storeConnectionData(
    connection: Connection,
    data: ConnectionData,
  ): Promise<boolean> {
    return storeConnectionDataImpl(this.host(), connection, data)
  }

  getConnectionData(connection: Connection | WebSocket): ConnectionData | null {
    return getConnectionDataImpl(this.host(), connection)
  }

  async getConnectedUsers(): Promise<ConnectedUser[]> {
    return getConnectedUsersImpl(this.host())
  }

  async broadcastToAll(message: unknown): Promise<void> {
    return broadcastToAllImpl(this.host(), message)
  }

  async broadcastToUser(userId: string, message: unknown): Promise<void> {
    return broadcastToUserImpl(this.host(), userId, message)
  }

  protected canAccessChannel(
    connection: Connection | WebSocket,
    channelName: string,
  ): boolean {
    return canAccessChannelImpl(this.host(), connection, channelName)
  }

  protected async broadcastToChannel<T = unknown>(
    channelName: string,
    action: string,
    payload?: T,
  ): Promise<void> {
    return broadcastToChannelImpl(this.host(), channelName, action, payload)
  }

  async updateIdleStatus(
    connection: Connection,
    isIdle: boolean,
  ): Promise<void> {
    return updateIdleStatusImpl(this.host(), connection, isIdle)
  }

  async broadcastConnectedUsers(): Promise<void> {
    return broadcastConnectedUsersImpl(this.host())
  }

  private async closeDuplicateConnectionsByInstance(
    userId: string,
    clientInstanceId: string,
    currentConnection: Connection,
  ): Promise<void> {
    return closeDuplicateConnectionsByInstanceImpl(
      this.host(),
      userId,
      clientInstanceId,
      currentConnection,
    )
  }

  /**
   * Aggressively check all connections by sending presence checks immediately
   * Used when a new connection arrives to quickly identify and remove stale connections
   */
  private async aggressiveConnectionCheck(): Promise<void> {
    return aggressiveConnectionCheckImpl(this.host())
  }

  protected async checkAndPingInactiveConnections(): Promise<void> {
    return checkAndPingInactiveConnectionsImpl(this.host())
  }

  protected async handleAppMessage(
    connection: Connection,
    data: AppWebSocketMessage,
  ): Promise<void> {
    // Default no-op implementation
    // Modern agents should use channels instead of app-specific messages
  }

  protected handleBinaryMessage?(
    connection: Connection,
    data: ArrayBuffer,
  ): Promise<void>

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static bindHandlersToPrototype<T extends BaseWebSocketAgent<any, any, any>>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    agentClass: new (...args: any[]) => T,
    handlerModule: Record<string, unknown>,
    modulePrefix?: string,
  ): void {
    bindHandlersToPrototype(agentClass, handlerModule, modulePrefix)
  }
}
