import { toast } from 'sonner'

type ChannelErrorPayload = {
  message?: string
  action?: string
}

export function toastChannelError(payload: ChannelErrorPayload) {
  const label = payload.action ? `${payload.action}: ` : ''
  toast.error(`${label}${payload.message ?? 'Something went wrong'}`)
}
