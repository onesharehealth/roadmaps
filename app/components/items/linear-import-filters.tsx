import { useId } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'

import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '~/components/ui/command'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { cn } from '~/lib/utils'
import type { useLinearImport } from './use-linear-import'

type LinearImportFiltersProps = {
  importState: ReturnType<typeof useLinearImport>
  aiEnabled: boolean
}

export function LinearImportFilters({ importState, aiEnabled }: LinearImportFiltersProps) {
  const { state, dispatch, issues, projects, labels, isLoading, isFetchingIssues, handleFetchIssues } =
    importState

  const projectListId = useId()
  const labelListId = useId()

  return (
    <div className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="search-query">Search</Label>
        <Input
          id="search-query"
          placeholder="Search by title or description"
          value={state.searchQuery}
          onChange={(e) => dispatch({ type: 'setSearchQuery', value: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="project-filter">Project</Label>
        <Popover open={state.projectOpen} onOpenChange={(value) => dispatch({ type: 'setProjectOpen', value })}>
          <PopoverTrigger asChild>
            <Button
              id="project-filter"
              variant="outline"
              role="combobox"
              aria-expanded={state.projectOpen}
              aria-controls={projectListId}
              className="w-full justify-between font-normal"
            >
              {state.projectFilter
                ? projects.find((project) => project.id === state.projectFilter)?.name
                : 'All projects'}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="z-100 w-(--radix-popover-trigger-width) max-w-(--radix-popover-trigger-width) p-0"
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <Command>
              <CommandInput placeholder="Search projects..." />
              <CommandList id={projectListId}>
                <CommandEmpty>No project found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="all-projects"
                    onSelect={() => {
                      dispatch({ type: 'setProjectFilter', value: '' })
                      dispatch({ type: 'setProjectOpen', value: false })
                    }}
                  >
                    <Check className={cn('mr-2 h-4 w-4', !state.projectFilter ? 'opacity-100' : 'opacity-0')} />
                    All projects
                  </CommandItem>
                  {projects.map((project) => (
                    <CommandItem
                      key={project.id}
                      value={project.name}
                      onSelect={() => {
                        dispatch({
                          type: 'setProjectFilter',
                          value: project.id,
                        })
                        dispatch({ type: 'setProjectOpen', value: false })
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          state.projectFilter === project.id ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      {project.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label htmlFor="label-filter">Label</Label>
        <Popover open={state.labelOpen} onOpenChange={(value) => dispatch({ type: 'setLabelOpen', value })}>
          <PopoverTrigger asChild>
            <Button
              id="label-filter"
              variant="outline"
              role="combobox"
              aria-expanded={state.labelOpen}
              aria-controls={labelListId}
              className="w-full justify-between font-normal"
            >
              {state.labelFilter ? labels.find((label) => label.name === state.labelFilter)?.name : 'All labels'}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="z-100 w-(--radix-popover-trigger-width) max-w-(--radix-popover-trigger-width) p-0"
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <Command>
              <CommandInput placeholder="Search labels..." />
              <CommandList id={labelListId}>
                <CommandEmpty>No label found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="all-labels"
                    onSelect={() => {
                      dispatch({ type: 'setLabelFilter', value: '' })
                      dispatch({ type: 'setLabelOpen', value: false })
                    }}
                  >
                    <Check className={cn('mr-2 h-4 w-4', !state.labelFilter ? 'opacity-100' : 'opacity-0')} />
                    All labels
                  </CommandItem>
                  {labels.map((label) => (
                    <CommandItem
                      key={label.id}
                      value={label.name}
                      onSelect={() => {
                        dispatch({
                          type: 'setLabelFilter',
                          value: label.name,
                        })
                        dispatch({ type: 'setLabelOpen', value: false })
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          state.labelFilter === label.name ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      {label.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label htmlFor="date-range">Date range (optional)</Label>
        <div className="flex gap-2">
          <Input
            type="date"
            value={state.startDate}
            onChange={(e) => dispatch({ type: 'setStartDate', value: e.target.value })}
            placeholder="Start"
            className="flex-1"
          />
          <Input
            type="date"
            value={state.endDate}
            onChange={(e) => dispatch({ type: 'setEndDate', value: e.target.value })}
            placeholder="End"
            className="flex-1"
          />
        </div>
      </div>

      <div className="col-span-full">
        <Button onClick={handleFetchIssues} disabled={isLoading} className="w-full">
          {isFetchingIssues ? 'Fetching...' : 'Fetch Issues'}
        </Button>
      </div>

      {issues.length > 0 && (
        <div className="col-span-full space-y-4 border-t border-gray-200 pt-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="collapse-sub-issues"
              checked={state.collapseSubIssues}
              onCheckedChange={(checked) =>
                dispatch({
                  type: 'setCollapseSubIssues',
                  value: Boolean(checked),
                })
              }
            />
            <Label htmlFor="collapse-sub-issues" className="cursor-pointer">
              Exclude sub-issues (only import parent issues)
            </Label>
          </div>

          {aiEnabled && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="summarize-linear"
                checked={state.summarize}
                onCheckedChange={(checked) =>
                  dispatch({
                    type: 'setSummarize',
                    value: Boolean(checked),
                  })
                }
              />
              <Label htmlFor="summarize-linear" className="cursor-pointer">
                Summarize descriptions with AI
              </Label>
            </div>
          )}

          <div className="space-y-2">
            <Label>Handling for existing issues</Label>
            <Select
              value={state.importOption}
              onValueChange={(value: 'skip' | 'overwrite') => dispatch({ type: 'setImportOption', value })}
            >
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Select handling option" />
              </SelectTrigger>
              <SelectContent onCloseAutoFocus={(e) => e.preventDefault()}>
                <SelectItem value="skip">Skip existing (ignore)</SelectItem>
                <SelectItem value="overwrite">Overwrite existing (update)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Determines what happens if an issue with the same Linear ID already exists in this session.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
