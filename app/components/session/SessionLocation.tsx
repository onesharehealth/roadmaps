import { useId, useRef, useState } from 'react'
import { Form, useFetcher } from 'react-router'
import { Check, ChevronsUpDown } from 'lucide-react'

import { Button } from '~/components/ui/button'
import { Command, CommandGroup, CommandItem, CommandList } from '~/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'
import { Label } from '~/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { cn } from '~/lib/utils'

type SessionLocationProps = {
  teamId: string | null
  currentTeamName: string | null
  teams: Array<{ id: string; name: string }>
  sessionName: string
  isOwner: boolean
  isConnected: boolean
}

export function getLocationValue(teamId: string | null) {
  return teamId ?? 'drafts'
}

export function getLocationLabel({
  teamId,
  currentTeamName,
}: {
  teamId: string | null
  currentTeamName: string | null
}) {
  if (teamId) return `Team: ${currentTeamName ?? 'Unknown team'}`
  return 'Personal drafts'
}

function getSelectedLocationLabel({
  selectedLocation,
  teams,
}: {
  selectedLocation: string
  teams: Array<{ id: string; name: string }>
}) {
  if (selectedLocation === 'drafts') return 'Personal drafts'
  return teams.find((team) => team.id === selectedLocation)?.name ?? 'Unknown team'
}

export function SessionLocation({
  teamId,
  currentTeamName,
  teams,
  sessionName,
  isOwner,
  isConnected,
}: SessionLocationProps) {
  const currentLocation = getLocationValue(teamId)
  const label = getLocationLabel({ teamId, currentTeamName })
  const canMove = isOwner && teams.length > 0

  if (!canMove) {
    return <p className="text-muted-foreground mt-1 text-sm">{label}</p>
  }

  return (
    <SessionLocationDialog
      currentLocation={currentLocation}
      label={label}
      teams={teams}
      sessionName={sessionName}
      isConnected={isConnected}
    />
  )
}

export type SessionLocationDialogProps = {
  currentLocation: string
  label: string
  teams: Array<{ id: string; name: string }>
  sessionName: string
  isConnected: boolean
  formAction?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  showTrigger?: boolean
}

export function SessionLocationDialog({
  currentLocation,
  label,
  teams,
  sessionName,
  isConnected,
  formAction,
  open: controlledOpen,
  onOpenChange,
  showTrigger = true,
}: SessionLocationDialogProps) {
  const fetcher = useFetcher()
  const isRemoteSubmit = Boolean(formAction)
  const LocationForm = isRemoteSubmit ? fetcher.Form : Form
  const isSubmitting = isRemoteSubmit && fetcher.state !== 'idle'
  const locationListId = useId()
  const locationOpenRef = useRef(false)
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const [locationOpen, setLocationOpen] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState(currentLocation)

  locationOpenRef.current = locationOpen

  const hasChanged = selectedLocation !== currentLocation
  const isDrafts = selectedLocation === 'drafts'
  const selectedLocationLabel = getSelectedLocationLabel({ selectedLocation, teams })

  function handleDialogOpenChange(nextOpen: boolean) {
    if (controlledOpen === undefined) setInternalOpen(nextOpen)
    onOpenChange?.(nextOpen)
    if (!nextOpen) setLocationOpen(false)
    if (nextOpen) setSelectedLocation(currentLocation)
  }

  function handleDialogPointerDownOutside(event: Event) {
    const target = event.target as HTMLElement

    if (target.closest('[data-slot="popover-content"]')) {
      event.preventDefault()
      return
    }

    if (locationOpenRef.current) setLocationOpen(false)
  }

  function handleDialogContentPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!locationOpenRef.current) return

    const target = event.target as HTMLElement
    if (target.closest('[data-slot="popover-trigger"]') || target.closest('[data-slot="popover-content"]')) {
      return
    }

    setLocationOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      {showTrigger && (
        <DialogTrigger asChild>
          <button type="button" className="text-muted-foreground mt-1 text-sm hover:underline">
            {label}
          </button>
        </DialogTrigger>
      )}

      <DialogContent
        onPointerDown={handleDialogContentPointerDown}
        onInteractOutside={handleDialogPointerDownOutside}
        onPointerDownOutside={handleDialogPointerDownOutside}
      >
        <DialogHeader>
          <DialogTitle>Where should this live?</DialogTitle>
        </DialogHeader>

        <LocationForm
          method="post"
          action={formAction}
          className="grid gap-4"
          onSubmit={() => handleDialogOpenChange(false)}
        >
          <input type="hidden" name="intent" value={isDrafts ? 'move-to-drafts' : 'move-to-team'} />
          <input type="hidden" name="name" value={sessionName} />
          {!isDrafts && <input type="hidden" name="teamId" value={selectedLocation} />}

          <div className="space-y-2">
            <Label htmlFor="session-location">Location</Label>
            <Popover open={locationOpen} onOpenChange={setLocationOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="session-location"
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={locationOpen}
                  aria-controls={locationListId}
                  className="w-full justify-between font-normal"
                >
                  {selectedLocationLabel}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="z-100 w-(--radix-popover-trigger-width) max-w-(--radix-popover-trigger-width) p-0"
                align="start"
                onOpenAutoFocus={(event) => event.preventDefault()}
              >
                <Command>
                  <CommandList id={locationListId}>
                    <CommandGroup>
                      <CommandItem
                        value="personal-drafts"
                        onSelect={() => {
                          setSelectedLocation('drafts')
                          setLocationOpen(false)
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            selectedLocation === 'drafts' ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        Personal drafts
                      </CommandItem>
                      {teams.map((team) => (
                        <CommandItem
                          key={team.id}
                          value={team.name}
                          onSelect={() => {
                            setSelectedLocation(team.id)
                            setLocationOpen(false)
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              selectedLocation === team.id ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          {team.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleDialogOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!hasChanged || !isConnected || isSubmitting}>
              Move
            </Button>
          </DialogFooter>
        </LocationForm>
      </DialogContent>
    </Dialog>
  )
}
