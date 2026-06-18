import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import {
  ESTIMATE_SIZE_ORDER,
  formatEstimate,
  isKnownEstimate,
  parseEstimateLabel,
} from '~/utils/estimate'

type EstimateSelectProps = {
  value: number | null
  onChange: (value: number | null) => void
}

export function EstimateSelect({ value, onChange }: EstimateSelectProps) {
  const selectValue = value == null ? 'none' : formatEstimate(value)

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-gray-700">Estimate</Label>
      <Select
        value={selectValue}
        onValueChange={(next) => {
          if (next === 'none') {
            onChange(null)
            return
          }
          const parsed = parseEstimateLabel(next)
          if (parsed != null) {
            onChange(parsed)
            return
          }
          const asNumber = Number(next)
          onChange(Number.isNaN(asNumber) ? null : asNumber)
        }}
      >
        <SelectTrigger
          size="sm"
          className="w-full"
        >
          <SelectValue placeholder="No estimate" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">None</SelectItem>
          {value != null && !isKnownEstimate(value) ? (
            <SelectItem value={formatEstimate(value)}>
              {formatEstimate(value)}
            </SelectItem>
          ) : null}
          {ESTIMATE_SIZE_ORDER.map((size) => (
            <SelectItem
              key={size}
              value={size}
            >
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
