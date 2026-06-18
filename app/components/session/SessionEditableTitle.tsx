import { useRef, useState } from 'react'
import { Form } from 'react-router'
import { Pencil } from 'lucide-react'

import { Input } from '~/components/ui/input'

type SessionEditableTitleProps = {
  sessionName: string
  canRename?: boolean
}

export function SessionEditableTitle({
  sessionName,
  canRename = false,
}: SessionEditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  function handleStartEditing() {
    setIsEditing(true)
    setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 0)
  }

  function handleSave() {
    const trimmedName = inputRef.current?.value.trim()

    if (!trimmedName || trimmedName === sessionName) {
      setIsEditing(false)
      return
    }

    formRef.current?.requestSubmit()
    setIsEditing(false)
  }

  function handleCancel() {
    setIsEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (isEditing) {
    return (
      <Form
        ref={formRef}
        method="post"
        className="flex flex-1 items-center gap-2"
      >
        <input
          type="hidden"
          name="intent"
          value="rename-session"
        />
        <Input
          ref={inputRef}
          name="name"
          defaultValue={sessionName}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="text-2xl font-semibold"
        />
      </Form>
    )
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <h1
        className="text-2xl font-semibold"
        title={canRename ? 'Use the pencil button to rename' : undefined}
      >
        {sessionName}
      </h1>
      {canRename && (
        <button
          type="button"
          onClick={handleStartEditing}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          title="Rename session"
        >
          <Pencil className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
