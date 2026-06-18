import { createContext, type ReactNode, useContext, useMemo } from 'react'
import { type IdleEvent, useIdle } from 'websockets/client'

type IdleContextType = {
  isIdle: boolean
  clientInstanceId: string
}

const IdleContext = createContext<IdleContextType | undefined>(undefined)

let tabClientInstanceId: string | null = null

function getClientInstanceId() {
  if (!tabClientInstanceId) tabClientInstanceId = crypto.randomUUID()
  return tabClientInstanceId
}

type IdleProviderProps = {
  children: ReactNode
  idleTimeoutMs?: number
  events?: IdleEvent[]
}

export function IdleProvider({
  children,
  idleTimeoutMs = 60_000,
  events = ['mousedown', 'resize', 'keydown', 'touchstart'],
}: IdleProviderProps) {
  const isIdle = useIdle(idleTimeoutMs, { events })
  const clientInstanceId = getClientInstanceId()

  const value = useMemo(
    () => ({
      isIdle,
      clientInstanceId,
    }),
    [isIdle, clientInstanceId],
  )

  return <IdleContext.Provider value={value}>{children}</IdleContext.Provider>
}

export function useIdleStatus() {
  const context = useContext(IdleContext)
  if (context === undefined) {
    throw new Error('useIdleStatus must be used within an IdleProvider')
  }
  return context
}
