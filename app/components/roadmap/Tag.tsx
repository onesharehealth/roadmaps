type TagProps = {
  text: string
  color: string
}

export function Tag({ text, color }: TagProps) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-700">
      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <span>{text}</span>
    </span>
  )
}

