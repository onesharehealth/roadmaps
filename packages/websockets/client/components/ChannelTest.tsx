import { useEffect, useState } from 'react'

import { useWebSocket } from '../contexts/WebSocketContext'

/**
 * Simple test component to demonstrate channel functionality
 *
 * This component can be added to any app to test the channel system.
 * It subscribes to the built-in 'test' channel and provides buttons
 * to send ping and broadcast messages.
 */
export function ChannelTest() {
  const { isConnected, subscribeToChannel, publishToChannel } = useWebSocket()

  const [responses, setResponses] = useState<
    Array<{ timestamp: number; action: string; payload: unknown }>
  >([])

  useEffect(() => {
    if (!isConnected) return

    // Subscribe to the test channel
    const unsubscribe = subscribeToChannel('test', {
      pong: (payload) => {
        console.log('[ChannelTest] Received pong:', payload)
        setResponses((prev) => [
          ...prev,
          {
            timestamp: Date.now(),
            action: 'pong',
            payload,
          },
        ])
      },
      'test-broadcast': (payload) => {
        console.log('[ChannelTest] Received test broadcast:', payload)
        setResponses((prev) => [
          ...prev,
          {
            timestamp: Date.now(),
            action: 'test-broadcast',
            payload,
          },
        ])
      },
      error: (payload) => {
        console.log('[ChannelTest] Received error:', payload)
        setResponses((prev) => [
          ...prev,
          {
            timestamp: Date.now(),
            action: 'error',
            payload,
          },
        ])
      },
    })

    // Cleanup subscription on unmount
    return () => {
      unsubscribe()
    }
  }, [isConnected, subscribeToChannel])

  const handlePing = () => {
    publishToChannel('test', 'ping', {
      message: 'Hello from client!',
      clientTime: Date.now(),
    })
  }

  const handleBroadcast = () => {
    publishToChannel('test', 'broadcast', {
      message: 'Broadcasting from client!',
      clientTime: Date.now(),
    })
  }

  const handleInvalidAction = () => {
    publishToChannel('test', 'invalid-action', {
      message: 'This should trigger an error response',
    })
  }

  const clearResponses = () => {
    setResponses([])
  }

  return (
    <div
      style={{
        border: '2px solid #ccc',
        borderRadius: '8px',
        padding: '16px',
        margin: '16px',
        backgroundColor: '#f9f9f9',
      }}
    >
      <h3>Channel Test Component</h3>
      <p>
        Connection Status:{' '}
        <strong>{isConnected ? '✅ Connected' : '❌ Disconnected'}</strong>
      </p>

      <div style={{ marginBottom: '16px' }}>
        <button
          onClick={handlePing}
          disabled={!isConnected}
          style={{
            marginRight: '8px',
            padding: '8px 16px',
            backgroundColor: isConnected ? '#4CAF50' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isConnected ? 'pointer' : 'not-allowed',
          }}
        >
          Send Ping
        </button>

        <button
          onClick={handleBroadcast}
          disabled={!isConnected}
          style={{
            marginRight: '8px',
            padding: '8px 16px',
            backgroundColor: isConnected ? '#2196F3' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isConnected ? 'pointer' : 'not-allowed',
          }}
        >
          Send Broadcast
        </button>

        <button
          onClick={handleInvalidAction}
          disabled={!isConnected}
          style={{
            marginRight: '8px',
            padding: '8px 16px',
            backgroundColor: isConnected ? '#FF9800' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isConnected ? 'pointer' : 'not-allowed',
          }}
        >
          Send Invalid Action
        </button>

        <button
          onClick={clearResponses}
          style={{
            padding: '8px 16px',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Clear Log
        </button>
      </div>

      <div>
        <h4>Channel Responses ({responses.length}):</h4>
        <div
          style={{
            maxHeight: '200px',
            overflowY: 'auto',
            border: '1px solid #ddd',
            padding: '8px',
            backgroundColor: 'white',
            fontSize: '12px',
            fontFamily: 'monospace',
          }}
        >
          {responses.length === 0 ? (
            <div style={{ color: '#666', fontStyle: 'italic' }}>
              No responses yet. Try sending a ping or broadcast message.
            </div>
          ) : (
            responses.map((response) => (
              <div
                key={`${response.timestamp}-${response.action}`}
                style={{ marginBottom: '4px' }}
              >
                <strong>
                  [{new Date(response.timestamp).toLocaleTimeString()}]
                </strong>{' '}
                <span style={{ color: '#0066cc' }}>{response.action}</span>:{' '}
                {JSON.stringify(response.payload)}
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ marginTop: '16px', fontSize: '12px', color: '#666' }}>
        <p>
          <strong>How to use this test:</strong>
        </p>
        <ul style={{ marginLeft: '20px' }}>
          <li>
            <strong>Send Ping:</strong> Tests basic request/response pattern
          </li>
          <li>
            <strong>Send Broadcast:</strong> Tests broadcasting to all connected
            clients
          </li>
          <li>
            <strong>Send Invalid Action:</strong> Tests error handling
          </li>
        </ul>
        <p>Open browser console to see detailed channel logs.</p>
      </div>
    </div>
  )
}
