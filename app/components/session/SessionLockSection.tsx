import { useState } from 'react'
import { Lock, Unlock } from 'lucide-react'

import { Button } from '~/components/ui/button'
import { useSessionLock } from '~/hooks/useSessionLock'
import { useSessionDetail } from './SessionDetailContext'

type SessionLockSectionProps = {
  sessionUuid: string
  initialLock?: { isLocked: boolean; lockedAt: number | null } | null
}

export function SessionLockSection({ sessionUuid, initialLock }: SessionLockSectionProps) {
  const { canManageSession, isConnected } = useSessionDetail()
  const { isLocked, setLock, isReady } = useSessionLock({ sessionUuid, initialLock })
  const [isConfirming, setIsConfirming] = useState(false)

  if (!canManageSession) return null

  const handleLock = () => {
    if (isLocked) {
      setLock(false)
      setIsConfirming(false)
      return
    }

    if (isConfirming) {
      setLock(true)
      setIsConfirming(false)
    } else {
      setIsConfirming(true)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        {isLocked ? <Lock className="h-5 w-5 text-amber-600" /> : <Unlock className="h-5 w-5 text-gray-500" />}
        <h2 className="text-lg font-semibold text-gray-800">Session lock</h2>
      </div>

      <p className="mb-4 text-sm text-gray-600">
        {isLocked
          ? 'This session is locked. Votes and edits are frozen, but sharing and ownership can still be managed.'
          : 'Lock this session to freeze votes and edits while preserving results for review.'}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={handleLock}
          variant={isLocked ? 'outline' : isConfirming ? 'destructive' : 'outline'}
          size="sm"
          disabled={!isConnected || !isReady}
          className={!isLocked && !isConfirming ? 'border-amber-200 text-amber-700 hover:bg-amber-50' : ''}
        >
          {isLocked ? 'Unlock session' : isConfirming ? 'Click to confirm lock' : 'Lock session'}
        </Button>
        {isConfirming && !isLocked && (
          <Button onClick={() => setIsConfirming(false)} variant="secondary" size="sm">
            Cancel
          </Button>
        )}
      </div>
    </div>
  )
}
