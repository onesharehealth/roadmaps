import { useState } from 'react'
import { Plus } from 'lucide-react'

import { Button } from '~/components/ui/button'
import { ItemFormFields } from './ItemFormFields'

type ItemInlineCreateProps = {
  isConnected: boolean
  onCreateItem: (params: { title: string; description?: string }) => void
}

export function ItemInlineCreate({
  isConnected,
  onCreateItem,
}: ItemInlineCreateProps) {
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  function handleCreate() {
    if (!title.trim()) return
    onCreateItem({
      title: title.trim(),
      description: description.trim() || undefined,
    })
    setTitle('')
    setDescription('')
    setShowForm(false)
  }

  if (!showForm) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setShowForm(true)}
        disabled={!isConnected}
        className="mb-4"
      >
        <Plus
          size={16}
          className="mr-1"
        />
        Add item
      </Button>
    )
  }

  return (
    <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-4">
      <h3 className="mb-3 text-sm font-medium text-blue-800">New item</h3>
      <ItemFormFields
        title={title}
        description={description}
        onTitleChange={setTitle}
        onDescriptionChange={setDescription}
      />
      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          size="sm"
          onClick={handleCreate}
          disabled={!title.trim()}
        >
          Create
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setShowForm(false)
            setTitle('')
            setDescription('')
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
