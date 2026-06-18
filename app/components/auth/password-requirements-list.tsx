import { Check, Circle, X } from 'lucide-react'
import { getPasswordChecks, passwordsMatch } from 'utils/password'

type PasswordRequirementsListProps = {
  password: string
  confirm?: string
  showMatch?: boolean
}

function RequirementIcon({ met, showStatus }: { met: boolean; showStatus: boolean }) {
  if (!showStatus) return <Circle className="text-muted-foreground/50 size-4 shrink-0" aria-hidden />

  if (met) return <Check className="size-4 shrink-0 text-green-600 dark:text-green-400" aria-hidden />

  return <X className="text-destructive size-4 shrink-0" aria-hidden />
}

export function PasswordRequirementsList({
  password,
  confirm,
  showMatch = confirm !== undefined,
}: PasswordRequirementsListProps) {
  const checks = getPasswordChecks(password)
  const showStatus = password.length > 0
  const matchMet = confirm !== undefined && passwordsMatch(password, confirm)
  const showMatchStatus = showMatch && confirm !== undefined && confirm.length > 0

  return (
    <ul className="grid gap-1.5 text-sm" aria-live="polite">
      {checks.map((check) => (
        <li key={check.id} className="flex items-center gap-2">
          <RequirementIcon met={check.met} showStatus={showStatus} />
          <span
            className={
              showStatus ? (check.met ? 'text-foreground' : 'text-muted-foreground') : 'text-muted-foreground'
            }
          >
            {check.label}
          </span>
        </li>
      ))}

      {showMatch && (
        <li className="flex items-center gap-2">
          <RequirementIcon met={matchMet} showStatus={showMatchStatus} />
          <span
            className={
              showMatchStatus ? (matchMet ? 'text-foreground' : 'text-muted-foreground') : 'text-muted-foreground'
            }
          >
            Passwords match
          </span>
        </li>
      )}
    </ul>
  )
}
