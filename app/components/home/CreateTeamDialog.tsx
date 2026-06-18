import { type ReactNode, useState } from 'react'
import { Form } from 'react-router'
import { PlusIcon } from 'lucide-react'

import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'

type CreateTeamDialogProps = {
  trigger?: ReactNode
  onNavigate?: () => void
}

export function CreateTeamDialog({ trigger, onNavigate }: CreateTeamDialogProps) {
  const [open, setOpen] = useState(false)

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) onNavigate?.()
  }

  const defaultTrigger = (
    <button type="button" className="nav-item flex w-full items-center gap-2 text-left">
      <PlusIcon className="size-4 shrink-0" aria-hidden />
      New team
    </button>
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create team</DialogTitle>
          <DialogDescription>Teams share sessions with everyone on the team.</DialogDescription>
        </DialogHeader>

        <Form method="post" className="grid gap-4" onSubmit={() => setOpen(false)}>
          <input type="hidden" name="intent" value="create-team" />

          <label className="grid gap-2 text-sm">
            <span className="font-medium">Team name</span>
            <input name="name" required placeholder="Engineering" className="field" />
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create team</Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
