import { useState } from 'react'
import { Form } from 'react-router'

import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { useSessionDetail } from './SessionDetailContext'

export function SessionSharing() {
  const { sharingInfo, userEmail, isOwner, isConnected } = useSessionDetail()
  const [shareEmail, setShareEmail] = useState('')
  const [sharePermission, setSharePermission] = useState<'read' | 'write'>(
    'read',
  )

  if (!isOwner) return null

  const emailConflict = shareEmail.trim() === userEmail

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold">Share with others</h2>

      <Form
        method="post"
        className="mb-6"
        onSubmit={() => setShareEmail('')}
      >
        <input
          type="hidden"
          name="intent"
          value="share"
        />

        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            type="email"
            name="email"
            placeholder="Enter email address"
            value={shareEmail}
            onChange={(e) => setShareEmail(e.target.value)}
            className="flex-1"
            disabled={!isConnected}
            required
          />

          <select
            name="permission"
            value={sharePermission}
            onChange={(e) =>
              setSharePermission(e.target.value as 'read' | 'write')
            }
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs"
            disabled={!isConnected}
          >
            <option value="read">Read only</option>
            <option value="write">Read & write</option>
          </select>

          <Button
            type="submit"
            size="sm"
            disabled={!isConnected || !shareEmail.trim() || emailConflict}
          >
            Share
          </Button>
        </div>

        {emailConflict && shareEmail.trim() && (
          <p className="mt-2 text-sm text-destructive">
            You cannot share with yourself
          </p>
        )}
      </Form>

      {sharingInfo.sharedWith.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Shared with
          </h3>

          {sharingInfo.sharedWith.map((share) => (
            <div
              key={share.email}
              className="flex flex-col gap-3 rounded-md border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <span className="text-sm font-medium">{share.email}</span>
                <span
                  className={`inline-flex w-fit items-center rounded-full px-2 py-1 text-xs font-medium ${
                    share.permission === 'write'
                      ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                  }`}
                >
                  {share.permission === 'write' ? 'Read & write' : 'Read only'}
                </span>
              </div>

              <Form method="post">
                <input
                  type="hidden"
                  name="intent"
                  value="unshare"
                />
                <input
                  type="hidden"
                  name="email"
                  value={share.email}
                />
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  className="border-destructive/30 text-destructive hover:bg-destructive/10"
                  disabled={!isConnected}
                >
                  Remove
                </Button>
              </Form>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          This session is not shared with anyone yet.
        </p>
      )}
    </div>
  )
}
