import { useState } from 'react'

import { Button } from '~/components/ui/button'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'

type BulkAddItemsFormProps = {
  onBulkCreate: (titles: string[]) => void
  onClose: () => void
}

export function BulkAddItemsForm({
  onBulkCreate,
  onClose,
}: BulkAddItemsFormProps) {
  const [titlesText, setTitlesText] = useState('')

  function handleSubmit() {
    const titles = titlesText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    if (titles.length === 0) return

    onBulkCreate(titles)
    setTitlesText('')
    onClose()
  }

  return (
    <div className="space-y-4">
      <div>
        <Label
          htmlFor="bulk-titles"
          className="mb-2 block text-sm font-medium"
        >
          Item titles
        </Label>
        <Textarea
          id="bulk-titles"
          placeholder="Enter one item title per line"
          value={titlesText}
          onChange={(e) => setTitlesText(e.target.value)}
          rows={8}
          className="w-full"
        />
        <p className="mt-1 text-xs text-gray-500">One title per line</p>
      </div>
      <Button
        type="button"
        onClick={handleSubmit}
        disabled={!titlesText.trim()}
      >
        Add items
      </Button>
    </div>
  )
}
