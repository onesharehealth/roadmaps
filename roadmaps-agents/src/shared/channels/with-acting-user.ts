import type { ChannelContext } from 'websockets/server'

/** Inject acting user from the authenticated connection — never trust wire payloads for identity. */
export function withActingUser<T extends Record<string, unknown>>(
  channel: ChannelContext,
  payload: T,
): T & { userId: string } {
  return { ...payload, userId: channel.userId }
}
