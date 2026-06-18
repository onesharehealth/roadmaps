import { ArrowDown, ArrowUp } from 'lucide-react'

interface OutcomeDividerProps {
  topLabel?: string
  bottomLabel?: string
}

export function OutcomeDivider({
  topLabel = 'Selected Items',
  bottomLabel = 'Other Items',
}: OutcomeDividerProps) {
  return (
    <div className="my-8 space-y-8">
      {/* Top section - what happens to selected items */}
      <div className="border-b-2 border-gray-300 pb-6">
        <div className="flex gap-4">
          <ArrowUp className="mt-1 flex-shrink-0 text-gray-800" size={32} strokeWidth={2.5} />
          <div>
            <h3 className="text-lg font-semibold text-gray-800">What happens to prioritized items?</h3>
            <p className="mt-2 text-sm text-gray-600">
              These items will be looked at in the near term. Stakeholders agree they deserve attention and are
              appropriate for the capacity of our team.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom section - what happens to items moving to backlog */}
      <div>
        <div className="flex gap-4">
          <ArrowDown className="mt-1 flex-shrink-0 text-gray-800" size={32} strokeWidth={2.5} />
          <div>
            <h3 className="text-lg font-semibold text-gray-800">What happens to items moving to backlog?</h3>
            <p className="mt-2 text-sm text-gray-600">
              Don't worry, these aren't being deleted, but they are being moved to the backlog. They won't come up
              in the next dot voting session, and they won't be given current attention. In the future, you can
              pull any items from the backlog to the current dot voting session if you want to advocate for them
              again.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
