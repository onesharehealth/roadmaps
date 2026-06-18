import { CircleHelp } from 'lucide-react'

import { Button } from '~/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover'
import {
  SessionPageHeader,
  type SessionPageHeaderProps,
} from './SessionPageHeader'

export function SessionHelpPopover(props: SessionPageHeaderProps) {
  const { title } = props

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Help: ${title}`}
        >
          <CircleHelp />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 max-w-[calc(100vw-2rem)]"
      >
        <SessionPageHeader {...props} />
      </PopoverContent>
    </Popover>
  )
}
