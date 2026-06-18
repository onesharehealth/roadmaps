import { z } from 'zod'

export const sessionTypeSchema = z.enum(['timeline', 'dot_voting', 'property_voting'])
export type SessionType = z.infer<typeof sessionTypeSchema>

export const sharePermissionSchema = z.enum(['read', 'write'])
export type SharePermission = z.infer<typeof sharePermissionSchema>

export const userRoleSchema = z.enum(['app_admin', 'user'])
export type UserRole = z.infer<typeof userRoleSchema>

export const teamMemberRoleSchema = z.enum(['admin', 'member'])
export type TeamMemberRole = z.infer<typeof teamMemberRoleSchema>

export const sessionRefSchema = z.object({
  uuid: z.string().uuid(),
  sessionType: sessionTypeSchema,
  name: z.string(),
  ownerEmail: z.string().email(),
  createdAt: z.number(),
})

export type SessionRef = z.infer<typeof sessionRefSchema>

export const sharedSessionRefSchema = sessionRefSchema.extend({
  permission: sharePermissionSchema,
  sharedAt: z.number(),
})

export type SharedSessionRef = z.infer<typeof sharedSessionRefSchema>
