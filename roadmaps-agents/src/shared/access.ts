import type { SharePermission } from './types'

export type AccessContext = {
  userId: string
  isOwner: boolean
  isTeamAdmin: boolean
  isTeamMember: boolean
  sharePermission?: SharePermission
}

export function canAccessSession(ctx: AccessContext) {
  return ctx.isOwner || ctx.isTeamMember || ctx.isTeamAdmin || !!ctx.sharePermission
}

export function canEditSession(ctx: AccessContext) {
  return ctx.isOwner || ctx.isTeamAdmin || ctx.sharePermission === 'write'
}

export function canVote(ctx: AccessContext) {
  if (!canAccessSession(ctx)) return false
  if (canEditSession(ctx)) return true
  return !!ctx.sharePermission || ctx.isTeamMember
}

export function canManageSharing(ctx: AccessContext) {
  return ctx.isOwner
}
