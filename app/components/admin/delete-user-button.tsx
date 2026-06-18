import { useState } from 'react'
import { Form } from 'react-router'

import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'

type DeleteUserButtonProps = {
  email: string
}

export function DeleteUserButton({ email }: DeleteUserButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" className="text-sm text-red-600 hover:text-red-700" onClick={() => setOpen(true)}>
        Delete
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete user?</DialogTitle>

            <DialogDescription>
              Permanently delete <span className="text-foreground font-medium">{email}</span>. They will be
              removed from all teams and lose access to Roadmaps. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>

            <Form method="post" onSubmit={() => setOpen(false)}>
              <input type="hidden" name="email" value={email} />
              <input type="hidden" name="intent" value="delete" />
              <input type="hidden" name="confirm" value="true" />

              <Button type="submit" variant="destructive">
                Delete user
              </Button>
            </Form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
