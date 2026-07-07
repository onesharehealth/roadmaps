import { Lock } from 'lucide-react'

type SessionLockedBannerProps = {
  isLocked: boolean
}

export function SessionLockedBanner({ isLocked }: SessionLockedBannerProps) {
  if (!isLocked) return null

  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
      <Lock className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="text-sm">
        <p className="font-medium">This session is locked</p>
        <p className="mt-0.5 text-amber-800">Votes and edits are frozen. Results are preserved for review.</p>
      </div>
    </div>
  )
}
