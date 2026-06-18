import { useSessionDetail } from './SessionDetailContext'

export function ConnectionStatus() {
  const { isConnected, connectedUsers, clientInstanceId, connectionError } =
    useSessionDetail()

  return (
    <div className="mb-6 rounded-lg border bg-card p-4 shadow-sm">
      {connectionError && (
        <p className="mb-3 text-sm text-destructive">{connectionError}</p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span
          className={`inline-flex items-center gap-2 text-sm ${
            isConnected ? 'text-green-600' : 'text-muted-foreground'
          }`}
        >
          <span
            className={`size-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-muted-foreground/50'
            }`}
          />
          {isConnected ? 'Connected' : 'Connecting...'}
        </span>

        {isConnected && connectedUsers.filter(Boolean).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {connectedUsers.filter(Boolean).map((user) => (
              <span
                key={user.connectionId}
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium ${
                  user.clientInstanceId === clientInstanceId
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
                title={`Connection: ${user.connectionId} - ${
                  user.isIdle ? 'Idle' : 'Active'
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    user.isIdle ? 'bg-orange-500' : 'bg-green-500'
                  }`}
                  aria-label={user.isIdle ? 'Idle' : 'Active'}
                />
                {user.clientInstanceId === clientInstanceId
                  ? `${user.username} (you)`
                  : user.username}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
