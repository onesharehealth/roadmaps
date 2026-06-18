# WebSocket Abstractions

A comprehensive package providing reusable WebSocket abstractions for both server-side agents and client-side React applications, with full support for Cloudflare Durable Objects hibernation.

## Features

### Server-Side (`BaseWebSocketAgent`)

- 🔌 **Automatic Connection Management** - Handle user authentication, stable connection IDs, and active connection tracking to prevent stale/duplicate connections
- 🎯 **Per-Tab Deduplication** - Use `clientInstanceId` as sole deduplication key - each browser tab gets exactly one connection per user, multiple devices shown as independent users
- 👥 **User Presence Tracking** - Built-in connected users management with independent per-connection idle status
- 🎯 **Server-Side Activity Monitoring** - Track client activity timestamps and detect inactive connections without keep-alive
- 📍 **Presence Check Pings** - Automatically ping inactive clients to verify they're still responsive and update their idle status (inactivity-based, not aggressive)
- 📡 **Broadcasting Utilities** - Easy methods for broadcasting to all users or specific users
- 🔄 **Message Routing** - Standardized message handling with app-specific delegation
- 📺 **Channel System** - Structured pub/sub messaging with domain-specific channels
- 🎯 **Dynamic Channel Registration** - Register channels based on entity state
- 🛡️ **Error Handling** - Robust error handling and connection attachment management
- 📊 **Logging & Monitoring** - Optional connection logging and debugging support
- 💤 **Hibernation Support** - Full Durable Objects hibernation with connection preservation
- 🔄 **Wake-up Detection** - Automatic detection and handling of hibernation recovery
- 💾 **State Persistence** - Connection data, including active connections, preserved across hibernation cycles
- 🧹 **Stale Connection Filtering** - Automatically filters out closed connections using `readyState` checks AND active connection tracking

### Client-Side (`useWebSocketAgent`)

- ⚛️ **React Hook** - Simple hook-based WebSocket connection management
- 😴 **Idle Tracking** - Configurable idle detection with server communication
- 👥 **Connected Users** - Automatic connected users state management
- 🔄 **Auto-Reconnection** - Built-in connection state management
- 🎯 **Message Handling** - Flexible message handling with custom handlers
- 📺 **Channel Subscriptions** - Subscribe to domain-specific channels with action handlers
- 📤 **Channel Publishing** - Publish actions to channels with type-safe payloads
- 📦 **Context Integration** - Optional React Context for app-wide state

## Installation

```bash
# Add to your package dependencies
pnpm add websockets@workspace:*
```

## Server-Side Usage

### Basic Implementation

```typescript
import { BaseWebSocketAgent, type AppWebSocketMessage } from 'websockets/server'
import type { Connection, ConnectionContext } from 'agents'

export class MyAgent extends BaseWebSocketAgent<Env, MyAgentState> {
  constructor(state: any, env: Env) {
    super(state, env, {
      maxAttachmentAttempts: 3,
      autoBroadcastConnectedUsers: true,
      enableConnectionLogging: process.env.WS_DEBUG === 'true',
    })
  }

  // Override lifecycle methods using standard inheritance pattern
  async onConnect(connection: Connection, ctx: ConnectionContext): Promise<void> {
    // Call base class to handle standard connection logic (authentication, connection ID, active tracking)
    await super.onConnect(connection, ctx)

    // Send app-specific initial state
    const initialData = await this.getInitialState()
    this.safeSend(
      // Use safeSend for all messages
      connection,
      JSON.stringify({
        type: 'initial-state',
        data: initialData,
      }),
    )
  }

  protected async handleAppMessage(connection: Connection, data: AppWebSocketMessage): Promise<void> {
    // Handle non-channel messages (legacy support)
    switch (data.type) {
      case 'my-app:action':
        await this.handleMyAppAction(connection, data.data)
        break
      default:
        console.log('Unknown message type:', data.type)
    }
  }

  /**
   * Single method to handle all channel registration - both static and dynamic
   * Called during initialization and automatically after state changes
   */
  protected registerChannels(): void {
    // Call parent to get the built-in test channel
    super.registerChannels()

    // Register static channels (always available)
    if (!this.getRegisteredChannels().includes('notifications')) {
      this.registerChannel('notifications', new NotificationChannelHandler())
    }

    // Register dynamic channels (depend on state)
    if (this.state.entityId) {
      const channelName = `entity:${this.state.entityId}:actions`
      if (!this.getRegisteredChannels().includes(channelName)) {
        this.registerChannel(channelName, new EntityChannelHandler(this))
      }
    }
  }

  async setStatePartial(state: Partial<MyAgentState>) {
    const result = await this.setState({ ...this.state, ...state })

    // Automatically re-register channels when state changes
    this.onStateChanged()

    return result
  }

  // Your app-specific methods
  private async getInitialState() {
    return {
      // Your app's initial state
    }
  }

  private async handleMyAppAction(connection: Connection, data: unknown) {
    // Handle app-specific actions
  }
}
```

### Hibernation Support

The `BaseWebSocketAgent` provides full support for Cloudflare Durable Objects hibernation, ensuring WebSocket connections are preserved and properly restored, including active connection tracking.

```typescript
export class MyAgent extends BaseWebSocketAgent<Env, MyAgentState> {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env, {
      autoBroadcastConnectedUsers: true,
    })

    // Log hibernation events for debugging
    console.log(
      `[MyAgent] Constructor called at ${new Date().toISOString()} - UUID: ${this.state.uuid || 'not-set'}`,
    )

    this.ctx.blockConcurrencyWhile(async () => {
      await this.initialize()
      console.log(`[MyAgent] Initialization complete at ${new Date().toISOString()} - UUID: ${this.state.uuid}`)
    })
  }

  async initialize() {
    await this.migrate() // Run database migrations

    // Detect wake-up from hibernation
    const activeWebSockets = this.ctx.getWebSockets()
    const isWakingFromHibernation = activeWebSockets.length > 0

    if (isWakingFromHibernation) {
      console.log(
        `[MyAgent] Detected wake-up from hibernation - UUID: ${this.state.uuid}, active connections: ${activeWebSockets.length}`,
      )

      // Ensure active connections are loaded before checking to prevent accidental cleanup
      await this.loadActiveConnectionsFromStorage()

      // Run cleanup for any connections that might have died during hibernation
      await this.checkAndPingInactiveConnections()

      // Broadcast latest data to all connections after hibernation
      // await this.broadcastLatestDataOnWakeUp()
    }

    if (!this.state.initialized) {
      await this.setStatePartial({ initialized: true })
    }
  }

  // Broadcast fresh data after hibernation wake-up (Optional - usually redundant as active connections already have state)
  async broadcastLatestDataOnWakeUp() {
    try {
      console.log(`[MyAgent] Broadcasting latest data on wake-up - UUID: ${this.state.uuid}`)

      // Get current data
      const currentData = await this.getCurrentData()
      const connectedUsers = await this.getConnectedUsers()

      const freshData = {
        type: 'wake-up:latest-data',
        data: {
          ...currentData,
          connectedUsers,
          timestamp: new Date().toISOString(),
        },
      }

      // Broadcast to all active connections
      const activeConnections = this.ctx.getWebSockets()
      await this.broadcastToAll(freshData)
      console.log(`[MyAgent] Successfully broadcasted latest data to ${activeConnections.length} connections`)
    } catch (error) {
      console.error(`[MyAgent] Error broadcasting latest data on wake-up:`, error)
    }
  }

  // Handle state changes with channel re-registration
  async setStatePartial(state: Partial<MyAgentState>) {
    const wasUuidNull = this.state.uuid === null
    const result = await this.setState({ ...this.state, ...state })

    // Re-register channels when UUID is first initialized (null → actual UUID)
    if (state.uuid && wasUuidNull) {
      console.log(`[MyAgent] UUID initialized to '${state.uuid}', registering UUID-based channels`)
    }

    // Always re-register channels to ensure consistency
    this.onStateChanged()

    return result
  }

  protected registerChannels(): void {
    super.registerChannels()

    // Register UUID-based channels only after initialization
    if (this.state.uuid) {
      const channelName = `entity:${this.state.uuid}:actions`
      if (!this.getRegisteredChannels().includes(channelName)) {
        this.registerChannel(channelName, new EntityChannelHandler(this))
        console.log(`[MyAgent] Registered channel: ${channelName}`)
      }
    } else {
      console.log(`[MyAgent] UUID not yet initialized, UUID-based channels will be registered after first setup`)
    }
  }
}
```

#### Key Hibernation Patterns:

1.  **Wake-up Detection**: Check `this.ctx.getWebSockets().length > 0` in `initialize()`
2.  **Zombie Connection Cleanup**: Call `checkAndPingInactiveConnections()` immediately on wake-up to remove dead connections.
3.  **Connection Persistence**: Base class handles `serializeAttachment`/`deserializeAttachment` and persists active connection IDs to Durable Object storage.
4.  **Channel Re-registration**: Channels are restored when `onStateChanged()` is called
5.  **State Initialization**: Handle the `uuid: null` → `uuid: "actual"` transition
6.  **Efficient Broadcasting**: Avoid broadcasting full state on every wake-up; rely on `onConnect` to serve new users.

### Server-Side Presence Tracking

The `BaseWebSocketAgent` includes automatic server-side presence tracking without requiring artificial keep-alive mechanisms. This ensures accurate user presence even when clients disconnect abruptly.

### Connection Deduplication with `clientInstanceId`

The server uses `clientInstanceId` as the **SOLE deduplication key**. This means:

- Each browser tab/instance gets one unique `clientInstanceId` (generated via `crypto.randomUUID()`)
- Each browser tab can have exactly ONE active connection per user
- Multiple devices have different `clientInstanceIds`, so they show as independent connected users
- Duplicate connections from the same tab are immediately closed, keeping only the newest

### How Presence Tracking Works

1. **Activity Tracking**: Each connection tracks `lastActivityTimestamp` - updated whenever a message arrives from the client
2. **Inactivity Detection**: When the Durable Object receives any message, it runs `checkAndPingInactiveConnections()` to identify connections inactive beyond the threshold
3. **Presence Checks**: Inactive connections receive a `activity:presence-check-request` ping
4. **Client Response**: Clients automatically respond with their current idle status
5. **Cleanup**: Connections that don't respond within 10 seconds are closed
6. **Per-Connection Idle State**: Each connection maintains independent idle state - deduplication is based on `clientInstanceId` only, not user activity

### Presence Check Strategy: Inactivity-Based (Not Aggressive)

The system uses an **inactivity-based** presence check strategy rather than an aggressive "ping all connections" approach. Here's why:

**Why Not Aggressive Checks:**

- **Reconnection Loops**: When a new connection arrives, aggressively pinging ALL existing connections can cause reconnection loops. Connections that are in the process of closing (e.g., during navigation) receive presence checks but can't respond because they're already closing, leading to timeout-based closures and repeated reconnections.
- **Unnecessary Overhead**: Pinging all connections on every new connection or alarm creates significant overhead, especially in apps with frequent navigation or multiple users.
- **Race Conditions**: Duplicate connection cleanup happens immediately when a new connection arrives. Aggressive checks right after this cleanup can ping connections that are mid-closure, causing timing issues.

**Current Strategy:**

- **Duplicate Cleanup**: Same `clientInstanceId` connections are immediately identified and closed (removed from tracking BEFORE closing to prevent race conditions)
- **Inactivity-Based Checks**: Only connections that have been inactive beyond their idle threshold are pinged
- **Alarm-Based Cleanup**: After a connection closes, an alarm triggers a check of inactive connections (not all connections)
- **Graceful Detection**: Stale connections from abrupt disconnects (laptop lid close, network failure) are detected when they exceed the inactivity threshold

**Trade-offs:**

- ✅ Stable connections during navigation and normal use
- ✅ No reconnection loops
- ✅ Lower overhead
- ⚠️ Stale connections from abrupt disconnects may linger slightly longer (until inactivity threshold is reached, typically 10-15 minutes)

This approach prioritizes connection stability and user experience over immediate stale connection detection, which is appropriate for applications with active user navigation and real-time collaboration.

### Configuration

```typescript
// Constants (customize in BaseWebSocketAgent if needed)
private readonly PRESENCE_CHECK_BUFFER_MS = 5 * 60 * 1000    // 5 min after client timeout
private readonly PRESENCE_CHECK_TIMEOUT_MS = 10 * 1000         // 10 sec to respond
private readonly DEFAULT_CLIENT_IDLE_TIMEOUT = 600000          // 10 min default
```

### Client Configuration

Clients automatically send their configured `idleTimeout` during connection:

```typescript
const { isConnected, connectedUsers } = useWebSocketAgent({
  agent: 'my-agent',
  name: 'instance-123',
  idleTimeout: 300000, // 5 minutes - sent to server
  idleEvents: ['mousedown', 'keydown', 'touchstart'],
})
```

### Benefits

- ✅ Accurate presence without server keep-alive
- ✅ Respects Durable Object hibernation
- ✅ Handles abrupt disconnections (network, laptop shutdown)
- ✅ Automatic cleanup of stale connections
- ✅ Minimal network overhead (only pings inactive clients)

## Advanced Features

```typescript
// Broadcasting to all users
await this.broadcastToAll({
  type: 'notification',
  message: 'Hello everyone!',
})

// Broadcasting to specific user
await this.broadcastToUser('user123', {
  type: 'direct-message',
  message: 'Hello user123!',
})

// Get connected users
const users = await this.getConnectedUsers()

// Manual connected users broadcast
await this.broadcastConnectedUsers()
```

## Channel System

The WebSocket package now includes a powerful channel system for structured pub/sub messaging. Channels provide:

- **Domain Organization**: Group related functionality (`sample:123:votes`, `user:456:notifications`)
- **Type Safety**: Strongly typed action payloads and responses
- **Real-time Streams**: Native streaming of state changes to all subscribers
- **Backward Compatibility**: Coexists with legacy message handling

### Channel Handler Example

```typescript
import { ChannelHandler, ChannelContext } from 'websockets/server'

export class VotesChannelHandler implements ChannelHandler {
  constructor(private agent: SampleDetailAgent) {}

  async handle(context: ChannelContext, action: string, payload?: unknown): Promise<void> {
    switch (action) {
      case 'cast': {
        const { username, vote } = payload as { username: string; vote: 'up' | 'down' }
        const result = await this.agent.castVote({ username, vote })

        if (result.ok) {
          // Confirm to the voter
          context.reply('castConfirmed', { vote, success: true })

          // Stream updated stats to all subscribers
          const stats = await this.agent.getVoteStats()
          if (stats.ok) {
            await context.broadcast('stats', stats.body)
          }
        } else {
          context.reply('error', { message: result.errors.join(', '), action: 'cast' })
        }
        break
      }

      case 'getStats': {
        const result = await this.agent.getVoteStats()
        context.reply('stats', result.ok ? result.body : { error: result.errors })
        break
      }

      default:
        context.reply('error', {
          message: `Unknown action: ${action}`,
          availableActions: ['cast', 'getStats'],
        })
    }
  }
}
```

### Client Channel Usage

```typescript
function VotingComponent({ sampleId }: { sampleId: string }) {
  const [voteStats, setVoteStats] = useState<VoteStats | null>(null)

  const {
    isConnected,
    subscribeToChannel,
    unsubscribeFromChannel,
    publishToChannel
  } = useWebSocketAgent({
    agent: 'sample-detail-agent',
    name: sampleId,
  })

  useEffect(() => {
    if (!isConnected) return

    // Subscribe to the votes channel for this sample
    subscribeToChannel(`sample:${sampleId}:votes`, {
      stats: (payload) => setVoteStats(payload as VoteStats),      // Stream: real-time stats
      castConfirmed: (payload) => console.log('Vote cast:', payload), // Action: confirmation
      error: (payload) => console.error('Vote error:', payload),      // Action: errors
    })

    return () => unsubscribeFromChannel(`sample:${sampleId}:votes`)
  }, [isConnected, sampleId])

  const handleVote = (vote: 'up' | 'down') => {
    publishToChannel(`sample:${sampleId}:votes`, 'cast', {
      username: 'current-user',
      vote
    })
  }

  return (
    <div>
      {voteStats && <div>👍 {voteStats.upVotes} 👎 {voteStats.downVotes}</div>}
      <button onClick={() => handleVote('up')}>Vote Up</button>
      <button onClick={() => handleVote('down')}>Vote Down</button>
    </div>
  )
}
```

For complete channel documentation, see [`CHANNELS.md`](./CHANNELS.md).

## Real-World Examples

### Sample App Implementation

The [Sample App](../../apps/sample/README.md) provides a complete reference implementation showcasing:

- **Real-time Voting System** with optimistic updates
- **User Sharing and Permissions** with live collaboration
- **Connected Users Tracking** with idle status
- **Hibernation Recovery** with state synchronization

Key files to study:

- [`SampleDetailAgent`](../../agents/sample/src/sample-detail/sample-detail.agent.ts) - Complete agent implementation
- [`SampleVotesChannelHandler`](../../agents/sample/src/sample-detail/channels/votes-channel.ts) - Channel handler example
- [`SampleDetailContext`](../../apps/sample/app/components/SampleDetailContext.tsx) - Client-side integration

### Voting Channel Example (from Sample App)

```typescript
// Server: agents/sample/src/sample-detail/channels/votes-channel.ts
export class SampleVotesChannelHandler implements ChannelHandler {
  constructor(private agent: SampleDetailAgent) {}

  async handle(message: ChannelMessage, context: ChannelContext): Promise<void> {
    switch (message.action) {
      case 'cast': {
        const { username, vote } = message.payload as { username: string; vote: 'up' | 'down' }

        // Validate user has access
        if (!this.agent.hasAccess({ username })) {
          context.reply('error', { message: 'Access denied' })
          return
        }

        const result = await this.agent.castVote({ username, vote })

        if (result.ok) {
          // Get updated statistics
          const statsResult = await this.agent.getVoteStats()

          if (statsResult.ok) {
            // Broadcast to all users in this sample
            await context.broadcast('vote-updated', {
              vote: result.body,
              stats: statsResult.body,
              timestamp: new Date().toISOString(),
            })
          }
        } else {
          context.reply('error', { message: result.errors.join(', ') })
        }
        break
      }

      case 'remove': {
        const { username } = message.payload as { username: string }
        const result = await this.agent.removeVote({ username })

        if (result.ok) {
          const statsResult = await this.agent.getVoteStats()
          if (statsResult.ok) {
            await context.broadcast('vote-updated', {
              vote: null,
              stats: statsResult.body,
              timestamp: new Date().toISOString(),
            })
          }
        } else {
          context.reply('error', { message: result.errors.join(', ') })
        }
        break
      }

      default:
        context.reply('error', {
          message: `Unknown action: ${message.action}`,
          availableActions: ['cast', 'remove'],
        })
    }
  }
}
```

```typescript
// Client: apps/sample/app/components/VotingComponent.tsx
function VotingComponent({ sampleUuid }: { sampleUuid: string }) {
  const [voteStats, setVoteStats] = useState<VoteStats | null>(null)
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null)
  const [isVoting, setIsVoting] = useState(false)

  const { isConnected, subscribeToChannel, publishToChannel } = useWebSocketAgent({
    agent: 'sample-detail-agent',
    name: sampleUuid,
  })

  useEffect(() => {
    if (!isConnected) return

    const unsubscribe = subscribeToChannel(`sample:${sampleUuid}:votes`, {
      'vote-updated': (payload: { vote: UserVote | null; stats: VoteStats }) => {
        setVoteStats(payload.stats)
        setIsVoting(false)

        // Update user's vote if it's theirs
        if (payload.vote?.username === currentUser.username) {
          setUserVote(payload.vote.vote)
        }
      },
      'error': (payload: { message: string }) => {
        console.error('Vote error:', payload.message)
        setIsVoting(false)
        // Show user-friendly error
        toast.error(payload.message)
      }
    })

    return unsubscribe
  }, [isConnected, sampleUuid])

  const handleVote = async (vote: 'up' | 'down') => {
    if (isVoting) return

    setIsVoting(true)

    // Optimistic update
    setUserVote(vote)

    publishToChannel(`sample:${sampleUuid}:votes`, 'cast', {
      username: currentUser.username,
      vote
    })
  }

  const handleRemoveVote = async () => {
    if (isVoting) return

    setIsVoting(true)
    setUserVote(null) // Optimistic update

    publishToChannel(`sample:${sampleUuid}:votes`, 'remove', {
      username: currentUser.username
    })
  }

  return (
    <div className="voting-component">
      {voteStats && (
        <div className="vote-stats">
          <span>👍 {voteStats.upVotes}</span>
          <span>👎 {voteStats.downVotes}</span>
          <span>Total: {voteStats.totalVotes}</span>
        </div>
      )}

      <div className="vote-buttons">
        <button
          onClick={() => handleVote('up')}
          disabled={isVoting}
          className={userVote === 'up' ? 'active' : ''}
        >
          👍 Vote Up
        </button>

        <button
          onClick={() => handleVote('down')}
          disabled={isVoting}
          className={userVote === 'down' ? 'active' : ''}
        >
          👎 Vote Down
        </button>

        {userVote && (
          <button onClick={handleRemoveVote} disabled={isVoting}>
            Remove Vote
          </button>
        )}
      </div>
    </div>
  )
}
```

## Client-Side Usage

### Basic Hook Usage

```typescript
import { useWebSocketAgent } from 'websockets/client'

function MyComponent() {
  // Generate a stable clientInstanceId for per-tab tracking (required for deduplication)
  const clientInstanceId = useRef<string>(crypto.randomUUID())

  const {
    connection,
    isConnected,
    connectedUsers,
    isIdle,
    isAttemptingReconnect,
    send,
    refreshConnectedUsers,
    subscribeToChannel,
    unsubscribeFromChannel,
    publishToChannel
  } = useWebSocketAgent({
    agent: 'my-agent',
    name: 'instance-123',
    idleTimeout: 30000, // 30 seconds
    // Optimize for Durable Object costs - only meaningful user actions wake from hibernation
    idleEvents: ['mousedown', 'keydown', 'touchstart'],
    onMessage: (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'my-app:update') {
        handleMyAppUpdate(data)
        return true // Prevent default handling
      }
      // Return undefined/void for both custom and default handling
    },
    onOpen: () => console.log('Connected!'),
    onClose: () => console.log('Disconnected!'),
    onError: (error) => console.error('Connection error:', error),
    metadata: {
      clientInstanceId: clientInstanceId.current, // Required for deduplication
    },
  })

  // Connection status respects both WebSocket readyState AND browser online status
  // If isConnected is false, the connection is genuinely unavailable
  return (
    <div>
      <p>Status: {isConnected ? 'Connected' : 'Disconnected'} {isAttemptingReconnect && '(Reconnecting...)'}</p>
      <p>Users online: {connectedUsers.length}</p>
      <p>You are: {isIdle ? 'Idle' : 'Active'}</p>
    </div>
  )
}

  // Subscribe to channels
  useEffect(() => {
    if (!isConnected) return

    subscribeToChannel('notifications', {
      alert: (payload) => showAlert(payload),
      update: (payload) => handleUpdate(payload),
    })

    return () => unsubscribeFromChannel('notifications')
  }, [isConnected])

  const handleSendMessage = () => {
    send({
      type: 'my-app:action',
      data: { action: 'do-something' }
    })
  }

  const handleChannelAction = () => {
    publishToChannel('notifications', 'trigger', { message: 'Hello channels!' })
  }

  return (
    <div>
      <p>Status: {isConnected ? 'Connected' : 'Disconnected'} {isAttemptingReconnect && '(Reconnecting...)'}</p>
      <p>Users online: {connectedUsers.length}</p>
      <p>You are: {isIdle ? 'Idle' : 'Active'}</p>
      <button onClick={handleSendMessage}>Send Legacy Message</button>
      <button onClick={handleChannelAction}>Send Channel Action</button>
    </div>
  )
}
```

### Context Provider Usage

The `WebSocketProvider` and `useWebSocket` have been removed in favor of direct `useWebSocketAgent` usage for better flexibility and explicit control over agent instances. When integrating with a React Context, you should wrap `useWebSocketAgent` directly within your app's context provider.

**Example of Context Provider with `useWebSocketAgent` (from Sample App):**

```typescript
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useWebSocketAgent } from 'websockets/client'
import type { ConnectedUser } from 'websockets/types'

interface SampleDetailContextType {
  connection: ReturnType<typeof useWebSocketAgent>['connection']
  isConnected: boolean
  isAuthenticated: boolean
  connectedUsers: ConnectedUser[]
  isIdle: boolean
  isAttemptingReconnect: boolean
  subscribeToChannel: (channel: string, handlers: Record<string, (payload: unknown) => void>) => void
  unsubscribeFromChannel: (channel: string) => void
  publishToChannel: (channel: string, action: string, payload?: unknown) => void
}

const SampleDetailContext = createContext<SampleDetailContextType | null>(null)

interface SampleDetailProviderProps {
  children: ReactNode
  sampleUuid: string
}

export function SampleDetailProvider({ children, sampleUuid }: SampleDetailProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Generate a stable clientInstanceId for per-tab tracking (REQUIRED for deduplication)
  // Each browser tab gets its own unique ID to prevent duplicate connections
  const clientInstanceId = useRef<string>(crypto.randomUUID())

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data)

      switch (data.type) {
        case 'initial-state':
          if (data.data) {
            console.log('[sample-detail] Received initial state:', data.data)
            setIsAuthenticated(true)
          }
          break
        default:
          break
      }
    } catch (error) {
      console.error('[sample-detail] Error parsing WebSocket message:', error)
    }
  }, [])

  const {
    connection,
    isConnected,
    connectedUsers,
    isIdle,
    isAttemptingReconnect,
    subscribeToChannel,
    unsubscribeFromChannel,
    publishToChannel,
  } = useWebSocketAgent({
    agent: 'sample-detail-agent',
    name: sampleUuid,
    idleTimeout: 60000,
    idleEvents: ['mousedown', 'keydown', 'touchstart'],
    onMessage: handleMessage,
    onOpen: () => {
      console.log('[sample-detail] Connected')
      setIsAuthenticated(false)
    },
    onClose: () => {
      console.log('[sample-detail] Disconnected')
      setIsAuthenticated(false)
    },
    onError: (error) => {
      console.error('[sample-detail] WebSocket error:', error)
      setIsAuthenticated(false)
    },
    metadata: {
      clientInstanceId: clientInstanceId.current, // REQUIRED - enables per-tab connection deduplication
    },
  })

  useEffect(() => {
    if (isConnected) {
      // Connected users list is automatically updated via 'connected-users:updated' messages
    }
  }, [isConnected])

  return (
    <SampleDetailContext.Provider
      value={{
        connection,
        isConnected,
        isAuthenticated,
        connectedUsers,
        isIdle,
        isAttemptingReconnect,
        subscribeToChannel,
        unsubscribeFromChannel,
        publishToChannel,
      }}
    >
      {children}
    </SampleDetailContext.Provider>
  )
}

export function useSampleDetail() {
  const context = useContext(SampleDetailContext)
  if (!context) {
    throw new Error('useSampleDetail must be used within a SampleDetailProvider')
  }
  return context
}
```

### Typed Context Hook (Removed)

The `createTypedWebSocketHook` utility has been removed. You should directly integrate `useWebSocketAgent` into your context providers and define your context types explicitly, as shown in the `SampleDetailProvider` example above.

## Configuration Options

### Server Options (`BaseWebSocketAgentOptions`)

| Option                        | Type      | Default                           | Description                             |
| :---------------------------- | :-------- | :-------------------------------- | :-------------------------------------- |
| `maxAttachmentAttempts`       | `number`  | `3`                               | Max retries for storing connection data |
| `autoBroadcastConnectedUsers` | `boolean` | `true`                            | Auto-broadcast user list updates        |
| `enableConnectionLogging`     | `boolean` | `process.env.WS_DEBUG === 'true'` | Enable connection logging               |

### Client Options (`WebSocketAgentOptions`)

| Option                         | Type          | Default                                                                  | Description                                                                                   |
| :----------------------------- | :------------ | :----------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------- |
| `agent`                        | `string`      | Required                                                                 | Agent name to connect to                                                                      |
| `name`                         | `string`      | Required                                                                 | Agent instance identifier                                                                     |
| `idleTimeout`                  | `number`      | `600000`                                                                 | Idle timeout in milliseconds (10 min)                                                         |
| `idleEvents`                   | `IdleEvent[]` | `['mousemove', 'mousedown', 'resize', 'keydown', 'touchstart', 'wheel']` | Events that reset the idle timer (reduce events to minimize Durable Object wake-ups)          |
| `idleThrottleMs`               | `number`      | `500`                                                                    | Throttle delay for idle event handlers in milliseconds                                        |
| `enableIdleTracking`           | `boolean`     | `true`                                                                   | Enable idle detection and communication                                                       |
| `enableConnectedUsersTracking` | `boolean`     | `true`                                                                   | Track connected users automatically                                                           |
| `onMessage`                    | `function`    | Optional                                                                 | Custom message handler for non-channel messages (return `true` to prevent default processing) |
| `onOpen/onClose/onError`       | `function`    | Optional                                                                 | Connection lifecycle callbacks                                                                |
| `metadata`                     | `object`      | Optional                                                                 | Custom metadata merged into the WebSocket query parameters                                    |

### Channel Methods (returned by `useWebSocketAgent`)

| Method               | Parameters                                                       | Description                                          |
| :------------------- | :--------------------------------------------------------------- | :--------------------------------------------------- |
| `subscribeToChannel` | `(channel: string, handlers: Record<string, (payload) => void>)` | Subscribe to a channel; returns unsubscribe function |
| `publishToChannel`   | `(channel: string, action: string, payload?: unknown)`           | Publish an action to a channel                       |

## Idle Tracking & Cost Optimization

The idle tracking feature helps manage user activity and optimize Durable Object costs by controlling when objects wake from hibernation.

### Cost Considerations

Cloudflare Durable Objects are billed based on active time. When a hibernated Durable Object receives a WebSocket message, it wakes up and incurs billing. By default, idle tracking monitors various user events (`mousemove`, `mousedown`, `resize`, `keydown`, `touchstart`, `wheel`), which can cause frequent wake-ups from incidental mouse movements.

### Optimizing Idle Events

To reduce costs, customize which events trigger activity detection. Use only meaningful user interactions:

```typescript
// Default - tracks all user activity (may cause frequent wake-ups)
const { isIdle } = useWebSocketAgent({
  agent: 'my-agent',
  name: 'instance-123',
  idleTimeout: 600000, // 10 minutes
})

// Optimized - only clicks and keyboard (fewer false wake-ups)
const { isIdle } = useWebSocketAgent({
  agent: 'my-agent',
  name: 'instance-123',
  idleTimeout: 600000,
  idleEvents: ['mousedown', 'keydown', 'touchstart'], // No mousemove or wheel
})

// Most aggressive - only explicit clicks (minimal wake-ups)
const { isIdle } = useWebSocketAgent({
  agent: 'my-agent',
  name: 'instance-123',
  idleTimeout: 600000,
  idleEvents: ['mousedown', 'touchstart'], // User must click to stay active
})
```

### Available Idle Events

- `mousemove` - Mouse movement (frequent, may cause many wake-ups)
- `mousedown` - Mouse clicks (user interaction)
- `resize` - Window resize
- `keydown` - Keyboard input (user interaction)
- `touchstart` - Touch screen interaction
- `wheel` - Mouse wheel/trackpad scrolling

### Using the Standalone `useIdle` Hook

For custom idle detection without WebSocket integration:

```typescript
import { useIdle } from 'websockets/client'

function MyComponent() {
  // Default behavior
  const isIdle = useIdle(30000) // 30 seconds, all events

  // Custom events
  const isIdleOptimized = useIdle(30000, {
    events: ['mousedown', 'keydown'],
    throttleMs: 1000 // Check at most once per second
  })

  return <div>User is {isIdle ? 'idle' : 'active'}</div>
}
```

### Using `useIdleTracking` with Callbacks (Removed)

The `useIdleTracking` hook with callbacks has been removed to simplify the API and promote a more declarative approach through `useWebSocketAgent`. You can achieve similar callback-driven logic by using `useEffect` with the `isIdle` state returned by `useWebSocketAgent`.

## Standard Messages

The abstractions handle these standard WebSocket messages automatically:

### Client → Server

- `activity:idle-status` - User idle status change
- `activity:ping` - Wake-up ping when returning from idle
- `connected-users:get` - Request connected users list

### Server → Client

- `initial-state` - Initial state when connecting
- `connected-users:updated` - Updated connected users list
- `error` - Error messages
- `wake-up:latest-data` - Broadcasts latest data to connections after a Durable Object wakes from hibernation.

## Migration Guide (Removed)

The migration guide has been removed as the core WebSocket abstractions are now stable and fully implemented. Refer to the "Server-Side Usage" and "Client-Side Usage" sections for current implementation patterns.

## Best Practices

1.  **Server Side:**

    - **Legacy Support**: Override `onConnect()` and call `super.onConnect()` first for app-specific initial state
    - **Legacy Support**: Override `onClose()` and call `super.onClose()` first for app-specific cleanup
    - **Channel Registration**: Override `registerChannels()` to handle both static and dynamic channels in one place
    - **State Changes**: Call `this.onStateChanged()` in `setStatePartial()` to automatically re-register channels
    - **Idempotent Design**: Make `registerChannels()` idempotent using `getRegisteredChannels()` checks
    - **Error Handling**: Use `context.reply('error', ...)` for channel errors instead of throwing
    - **Broadcasting**: Use `context.broadcast()` for channel-wide messages, `broadcastToAll()` for global ones
    - **Logging**: Connection logging is controlled by `WS_DEBUG` environment variable

2.  **Client Side:**

    - **Client Instance ID**: REQUIRED - Always provide a stable `clientInstanceId` in the `metadata` option of `useWebSocketAgent` (e.g., `crypto.randomUUID()` in a `useRef`). Each browser tab/instance must have its own unique ID for proper deduplication
    - **Channels**: Subscribe to channels in `useEffect()` with proper cleanup
    - **Legacy Messages**: Use `onMessage` for non-channel messages only
    - **Context Integration**: Pass channel methods through existing contexts for shared connections
    - **Type Safety**: Use typed payload interfaces for better TypeScript support
    - **Error Handling**: Always include `error` action handlers in channel subscriptions

3.  **Channel Design:**

    - **Naming**: Use hierarchical naming (`entity:id:domain`) for organization
    - **Actions**: Use verb names (`cast`, `remove`, `update`) not message types
    - **Streams**: Use nouns (`stats`, `status`) for real-time data streams
    - **Responses**: Use past tense (`castConfirmed`, `updateCompleted`) for confirmations
    - **Migration**: Start with one domain (e.g., voting) and migrate incrementally

4.  **Performance:**
    - The abstractions handle connection attachment retries and error recovery
    - Connected users are automatically tracked and broadcasted
    - Idle status is efficiently managed with minimal server communication
    - Channel subscriptions are lightweight and can be created/destroyed dynamically

## Testing

```typescript
// Test with the hook
import { renderHook } from '@testing-library/react'
import { useWebSocketAgent } from 'websockets/client'

test('should connect to agent', () => {
  const { result } = renderHook(() =>
    useWebSocketAgent({
      agent: 'test-agent',
      name: 'test-instance',
    }),
  )

  expect(result.current.isConnected).toBe(false)
  // Test connection lifecycle...
})
```

## Troubleshooting

**Connection Issues:**

- Ensure the agent name and instance name are correct
- Check that the server-side agent implements the required abstract methods
- Verify WebSocket endpoint configuration in your app
- **Missing clientInstanceId**: If you see "clientInstanceId required" errors, make sure you're passing a stable `clientInstanceId` in the `metadata` option (e.g., generated once per tab with `crypto.randomUUID()` in a `useRef`)
- **Duplicate users appearing**: This is usually caused by missing or non-unique `clientInstanceId` values. Verify each connection has a stable, unique ID that doesn't change during the connection's lifetime

**Hibernation Issues:**

- **Zombie connections**: Ensure `loadActiveConnectionsFromStorage()` and `checkAndPingInactiveConnections()` are called in `initialize()` when waking from hibernation.
- **Channel registration failures**: Check that `registerChannels()` is idempotent and handles `uuid: null` state
- **Connection data loss**: Verify `BaseWebSocketAgent` is handling `serializeAttachment`/`deserializeAttachment` and persisting active connection IDs to storage.
- **State inconsistency**: Call `this.onStateChanged()` in `setStatePartial()` to re-register channels
- **Debug hibernation**: Add constructor logging with timestamps to track wake-up events
- **Stale connections showing as active**: This is now automatically handled by filtering connections based on `readyState` and active connection tracking using the `activeConnectionIds` Set.

**Offline Detection:**

- **Connection shows as connected when offline**: The `isConnected` state now correctly respects both `WebSocket.readyState === OPEN` AND `navigator.onLine === true`. If the browser is offline, `isConnected` will be `false` even if the WebSocket object hasn't closed yet.
- **False positive connections during network transitions**: The presence tracking system automatically cleans up connections that don't respond to presence check pings, even if they falsely report as open during network transitions.

**Idle Tracking:**

- Adjust `idleTimeout` based on your app's requirements
- Disable idle tracking if not needed: `enableIdleTracking: false`
- Check browser console for idle status messages

**Channel Issues:**

- **Subscription not working**: Ensure channel is registered on server before client subscribes
- **Messages not received**: Check channel name matches exactly between client and server
- **Handler not called**: Verify action name in `subscribeToChannel` matches server `context.broadcast()`
- **Type errors**: Use proper TypeScript interfaces for channel payloads

**Message Handling:**

- Return `true` from custom `onMessage` handlers only to prevent default processing
- By default, both custom and built-in handlers will process messages
- Use browser dev tools to inspect WebSocket messages
- Check server logs for message processing errors
- Set `WS_DEBUG=true` environment variable to enable connection logging

**Performance Issues:**

- **Too many re-registrations**: Ensure `registerChannels()` uses idempotent checks
- **Memory leaks**: Always unsubscribe from channels in React `useEffect` cleanup
- **Excessive broadcasting**: Use channel-specific broadcasts instead of `broadcastToAll()`
