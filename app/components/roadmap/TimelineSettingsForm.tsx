import { useFetcher } from 'react-router'
import type { RoadmapTimelineSettings } from 'roadmaps-agents/schemas'

import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'

type TimelineSettingsFormProps = {
  settings: import('roadmaps-agents/schemas').RoadmapTimelineSettings | null
  isConnected: boolean
  canEdit: boolean
}

export function TimelineSettingsForm({ settings, isConnected, canEdit }: TimelineSettingsFormProps) {
  const fetcher = useFetcher()
  const canUpdate = canEdit

  const isSubmitting = fetcher.state !== 'idle'
  const error = fetcher.data && 'error' in fetcher.data ? (fetcher.data as { error?: string }).error : null

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    formData.set('intent', 'update-timeline-settings')
    fetcher.submit(formData, { method: 'post' })
  }

  if (!settings) return null

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-gray-100">Timeline Settings</h2>
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        Configure the long-term roadmap timeline. Cycle length + cooldown define each cycle period.
      </p>

      <fetcher.Form method="post" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cycleLengthWeeks">Cycle length (weeks)</Label>
            <Input
              id="cycleLengthWeeks"
              name="cycleLengthWeeks"
              type="number"
              min={1}
              defaultValue={settings.cycleLengthWeeks}
              disabled={!canUpdate || !isConnected}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cooldownWeeks">Cooldown (weeks)</Label>
            <Input
              id="cooldownWeeks"
              name="cooldownWeeks"
              type="number"
              min={0}
              defaultValue={settings.cooldownWeeks}
              disabled={!canUpdate || !isConnected}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="startDate">Timeline start date</Label>
            <Input
              id="startDate"
              name="startDate"
              type="date"
              defaultValue={settings.startDate}
              disabled={!canUpdate || !isConnected}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cycleStartNumber">Cycle start number</Label>
            <Input
              id="cycleStartNumber"
              name="cycleStartNumber"
              type="number"
              min={1}
              defaultValue={settings.cycleStartNumber}
              disabled={!canUpdate || !isConnected}
              placeholder="e.g. 19 for C19"
            />
          </div>
        </div>

        {canUpdate && isConnected && (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Settings'}
          </Button>
        )}

        {!isConnected && (
          <p className="text-sm text-orange-600 dark:text-orange-400">
            Not connected - changes will not be saved until you reconnect
          </p>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </fetcher.Form>
    </div>
  )
}
