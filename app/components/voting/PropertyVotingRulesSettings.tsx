import type { PropertyVotingSettings } from 'roadmaps-agents/schemas'

import { useSessionDetail } from '~/components/session/SessionDetailContext'
import { SessionSettingsSection } from '~/components/session/SessionSettingsSection'
import { usePropertyVotingSettings } from '~/hooks/usePropertyVotingSettings'

type PropertyVotingRulesSettingsProps = {
  sessionUuid: string
  initialSettings: PropertyVotingSettings | null
}

export function PropertyVotingRulesSettings({ sessionUuid, initialSettings }: PropertyVotingRulesSettingsProps) {
  const { canEdit, isConnected } = useSessionDetail()
  const { settings, updateSettings, isReady } = usePropertyVotingSettings({
    sessionUuid,
    initialSettings,
  })

  if (!canEdit) {
    return (
      <SessionSettingsSection
        title="Voting rules"
        description="Configure how vote changes behave during a session."
      >
        <p className="text-sm text-gray-600">Only editors can change voting rules.</p>
      </SessionSettingsSection>
    )
  }

  return (
    <SessionSettingsSection
      title="Voting rules"
      description="Configure how vote changes behave during a session."
    >
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          className="mt-1"
          checked={settings.requireAllVotersPresent}
          disabled={!isConnected || !isReady}
          onChange={(event) => updateSettings(event.target.checked)}
        />
        <span className="text-sm text-gray-700">
          <span className="font-medium text-gray-900">
            Require all voters to be online before changing a vote
          </span>
          <span className="mt-1 block text-gray-600">
            When enabled, you can only change your vote after everyone who has voted on that property is currently
            in the session. This encourages live discussion before revising alignment scores.
          </span>
        </span>
      </label>
    </SessionSettingsSection>
  )
}
