import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'

type ItemFormFieldsProps = {
  title: string
  description: string
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  titlePlaceholder?: string
  descriptionPlaceholder?: string
}

export function ItemFormFields({
  title,
  description,
  onTitleChange,
  onDescriptionChange,
  titlePlaceholder = 'Item title',
  descriptionPlaceholder = 'Description (optional)',
}: ItemFormFieldsProps) {
  return (
    <div className="space-y-3">
      <Input
        placeholder={titlePlaceholder}
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        className="w-full"
      />
      <Textarea
        placeholder={descriptionPlaceholder}
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        className="w-full"
        rows={3}
      />
    </div>
  )
}
