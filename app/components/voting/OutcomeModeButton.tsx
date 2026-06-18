import { BarChart3 } from 'lucide-react'

interface OutcomeModeButtonProps {
  isOutcomeMode: boolean
  onClick: () => void
  userTotalVotes: number
  dotsPerVoter: number
}

export function OutcomeModeButton({
  isOutcomeMode,
  onClick,
  userTotalVotes,
  dotsPerVoter,
}: OutcomeModeButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
        isOutcomeMode
          ? 'border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100'
          : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
      } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
      title={isOutcomeMode ? 'Exit Outcome Mode' : 'Enter Outcome Mode'}
    >
      <BarChart3 size={16} />
      <span className="hidden sm:inline">
        Outcome Mode {isOutcomeMode ? '(Active)' : ''}
      </span>
      <span className="text-xs font-semibold text-gray-600">
        {userTotalVotes}/{dotsPerVoter}
      </span>
    </button>
  )
}

