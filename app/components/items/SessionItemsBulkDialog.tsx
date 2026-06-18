import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'

import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { BulkAddItemsForm } from './BulkAddItemsForm'
import { LinearImportForm } from './LinearImportForm'

type SessionItemsBulkDialogProps = {
  items: Array<{ externalId?: string | null }>
  linearEnabled: boolean
  aiEnabled: boolean
  onBulkCreate: (titles: string[]) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
}

export function SessionItemsBulkDialog({
  items,
  linearEnabled,
  aiEnabled,
  onBulkCreate,
  open,
  onOpenChange,
  trigger,
}: SessionItemsBulkDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'bulk' | 'linear'>('bulk')
  const isControlled = open !== undefined
  const dialogOpen = isControlled ? open : internalOpen

  const existingExternalIds = useMemo(
    () =>
      new Set(
        items
          .filter((item) => item.externalId)
          .map((item) => item.externalId as string),
      ),
    [items],
  )

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setActiveTab('bulk')
    if (!isControlled) setInternalOpen(nextOpen)
    onOpenChange?.(nextOpen)
  }

  function handleClose() {
    handleOpenChange(false)
  }

  const defaultTrigger = (
    <Button
      type="button"
      variant="secondary"
      size="sm"
    >
      <Plus
        size={16}
        className="mr-1"
      />
      <span className="hidden sm:inline">Add items</span>
      <span className="sm:hidden">Add</span>
    </Button>
  )

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={handleOpenChange}
    >
      {trigger !== null && (
        <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
      )}
      <DialogContent
        className={
          linearEnabled
            ? 'max-h-[90vh] max-w-4xl overflow-y-auto sm:max-w-4xl'
            : 'sm:max-w-lg'
        }
      >
        <DialogHeader>
          <DialogTitle>Add items</DialogTitle>
        </DialogHeader>

        {linearEnabled ? (
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as 'bulk' | 'linear')}
          >
            <TabsList className="w-full">
              <TabsTrigger
                value="bulk"
                className="flex-1"
              >
                Bulk add
              </TabsTrigger>
              <TabsTrigger
                value="linear"
                className="flex-1"
              >
                Import from Linear
              </TabsTrigger>
            </TabsList>
            <TabsContent
              value="bulk"
              className="mt-4 "
            >
              <BulkAddItemsForm
                onBulkCreate={onBulkCreate}
                onClose={handleClose}
              />
            </TabsContent>
            <TabsContent
              value="linear"
              forceMount
              className="mt-4 data-[state=inactive]:hidden"
            >
              <LinearImportForm
                existingExternalIds={existingExternalIds}
                aiEnabled={aiEnabled}
                onClose={handleClose}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <BulkAddItemsForm
            onBulkCreate={onBulkCreate}
            onClose={handleClose}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
