import { useEffect } from 'react'

import type { WebSocketAgentReturn } from '../types'

type ConnectionState = {
  isConnected: boolean
  setIsConnected: (value: boolean) => void
  isAttemptingReconnect: boolean
  setIsAttemptingReconnect: (value: boolean) => void
}

export function useConnectionStatus(
  connection: WebSocketAgentReturn['connection'],
  { isConnected, setIsConnected, setIsAttemptingReconnect }: ConnectionState,
): void {
  // Handle network online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log(
        '[useWebSocketAgent] Browser is online. Attempting to reconnect.',
      )
      if (!isConnected && connection?.readyState !== WebSocket.OPEN) {
        setIsAttemptingReconnect(true)
        connection?.reconnect() // Assuming useAgent provides a reconnect method
      }
    }

    const handleOffline = () => {
      console.log('[useWebSocketAgent] Browser is offline. Disconnecting.')
      setIsConnected(false)
      setIsAttemptingReconnect(true) // Show connecting state when offline
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }
    }
  }, [connection, isConnected, setIsConnected, setIsAttemptingReconnect])

  // Monitor WebSocket readyState for more accurate connection status
  useEffect(() => {
    if (!connection) return

    const updateConnectionStatus = () => {
      // Only consider connection open if readyState is OPEN AND browser is online
      const newIsConnected =
        connection.readyState === WebSocket.OPEN && navigator.onLine
      const newIsAttemptingReconnect =
        connection.readyState === WebSocket.CONNECTING ||
        (!navigator.onLine && connection.readyState !== WebSocket.OPEN)

      setIsConnected(newIsConnected)
      setIsAttemptingReconnect(newIsAttemptingReconnect)
    }

    // Initial status check
    updateConnectionStatus()

    // Use a longer polling interval to avoid excessive reconnections
    // The real connection events (onopen/onclose) should handle most cases
    // This is just a fallback check every 10 seconds
    const interval = setInterval(updateConnectionStatus, 10000) // Check every 10 seconds instead of 1 second

    return () => clearInterval(interval)
  }, [connection, setIsConnected, setIsAttemptingReconnect])
}
