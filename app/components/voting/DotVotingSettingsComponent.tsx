import { useEffect, useState } from 'react'
import type { DotVotingSettings } from 'roadmaps-agents/schemas'
import { DEFAULT_DOT_VOTING_DOTS_PER_VOTER } from 'roadmaps-agents/schemas'

import { useSessionDetail } from '~/components/session/SessionDetailContext'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { useDotVotingSettings } from '~/hooks'

type DotVotingSettingsComponentProps = {
  sessionUuid: string
  initialSettings: DotVotingSettings | null
}

export function DotVotingSettingsComponent({ sessionUuid, initialSettings }: DotVotingSettingsComponentProps) {
  const { isConnected, canEdit } = useSessionDetail()
  const [inputValue, setInputValue] = useState<string>(
    initialSettings?.dotsPerVoter?.toString() || DEFAULT_DOT_VOTING_DOTS_PER_VOTER.toString(),
  )
  const [error, setError] = useState<string | null>(null)
  const [isResetConfirming, setIsResetConfirming] = useState(false)

  const { settings, updateSettings, resetVotes, isReady } = useDotVotingSettings({
    sessionUuid,
    initialSettings,
  })

  useEffect(() => {
    if (settings?.dotsPerVoter) {
      setInputValue(settings.dotsPerVoter.toString())
      setError(null)
    }
  }, [settings?.dotsPerVoter])

  const handleSave = () => {
    setError(null)
    const dots = parseInt(inputValue, 10)

    if (isNaN(dots)) {
      setError('Please enter a valid number')
      return
    }

    if (dots < 1) {
      setError('Dots per voter must be at least 1')
      return
    }

    if (dots > 50) {
      setError('Dots per voter cannot exceed 50')
      return
    }

    updateSettings(dots)
  }

  const handleReset = () => {
    if (isResetConfirming) {
      resetVotes()
      setIsResetConfirming(false)
    } else {
      setIsResetConfirming(true)
    }
  }

  if (!canEdit) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Dot Voting Settings</h2>
        <p className="text-sm text-gray-600">Only session editors can manage dot voting settings.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-800">Dot Voting Settings</h2>

      <div className="mb-6 rounded-md bg-blue-50 p-4">
        <p className="text-sm text-blue-800">
          <strong>Dots Per Voter:</strong> The number of dots each participant receives to distribute across
          session items.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="dotsPerVoter" className="mb-2 block text-sm font-medium text-gray-700">
            Number of Dots Per Voter
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              id="dotsPerVoter"
              type="number"
              min="1"
              max="50"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter number of dots"
              className="flex-1"
              disabled={!isConnected || !isReady}
            />
            <Button onClick={handleSave} disabled={!isConnected || !isReady} size="sm">
              Save
            </Button>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>

        <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">Current Settings</h3>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Dots per voter:</span>
            <span className="text-lg font-semibold text-gray-900">{settings?.dotsPerVoter || '—'}</span>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <h3 className="mb-2 text-sm font-semibold text-red-700">Danger Zone</h3>
          <p className="mb-4 text-xs text-gray-500">
            Resetting votes will permanently remove all votes cast by all participants.
          </p>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleReset}
              variant={isResetConfirming ? 'destructive' : 'outline'}
              size="sm"
              className={isResetConfirming ? '' : 'border-red-200 text-red-600 hover:bg-red-50'}
              disabled={!isConnected || !isReady}
            >
              {isResetConfirming ? 'Click to Confirm Reset' : 'Reset All Votes'}
            </Button>
            {isResetConfirming && (
              <Button onClick={() => setIsResetConfirming(false)} variant="secondary" size="sm">
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
