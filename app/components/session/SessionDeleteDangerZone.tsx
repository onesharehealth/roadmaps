import { useState } from 'react'
import { Form } from 'react-router'

import { Button } from '~/components/ui/button'
import { useSessionDetail } from './SessionDetailContext'

export function SessionDeleteDangerZone() {
  const { isOwner } = useSessionDetail()
  const [isConfirming, setIsConfirming] = useState(false)

  if (!isOwner) return null

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-2 text-sm font-semibold text-red-700">Danger Zone</h3>
      <p className="mb-4 text-xs text-gray-500">
        Permanently delete this session and all of its items, votes, and
        settings. This cannot be undone.
      </p>

      <Form
        method="post"
        className="flex flex-wrap items-center gap-3"
      >
        <input
          type="hidden"
          name="intent"
          value="delete-session"
        />

        {isConfirming ? (
          <>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
            >
              Click to confirm delete
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsConfirming(false)}
            >
              Cancel
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-red-200 text-red-600 hover:bg-red-50"
            onClick={() => setIsConfirming(true)}
          >
            Delete session
          </Button>
        )}
      </Form>
    </div>
  )
}
