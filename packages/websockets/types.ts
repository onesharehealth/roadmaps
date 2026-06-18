export interface ConnectedUser {
  username: string
  connectionId: string
  connectedAt: number
  isIdle: boolean
  userAgent?: string
  clientInstanceId?: string
}

export interface ConnectionData {
  userId: string
  connectionId: string
  connectedAt: number
  isIdle: boolean
  userAgent?: string
  clientInstanceId?: string
  lastActivityTimestamp: number
  clientIdleTimeout: number
}

export interface WebSocketMessage {
  type: string
  data?: unknown
  [key: string]: unknown
}

export interface IdleStatusMessage {
  type: 'activity:idle-status'
  data: {
    isIdle: boolean
    userEmail?: string
  }
}

export interface InitialStateMessage<T = unknown> {
  type: 'initial-state'
  data: T
}

export interface ConnectedUsersUpdateMessage {
  type: 'connected-users:updated'
  data: {
    connectedUsers: ConnectedUser[]
  }
}

export interface ActivityPresenceCheckRequest {
  type: 'activity:presence-check-request'
}

export interface ActivityPresenceCheckResponse {
  type: 'activity:presence-check-response'
  data: {
    isIdle: boolean
  }
}

export type StandardWebSocketMessages =
  | IdleStatusMessage
  | InitialStateMessage
  | ConnectedUsersUpdateMessage
  | ActivityPresenceCheckRequest
  | ActivityPresenceCheckResponse
