import { z } from 'zod'

export const userRecordSchema = z.object({
  email: z.string().email(),
  passwordHash: z.string(),
  role: z.enum(['app_admin', 'user']),
  status: z.enum(['active', 'deactivated']),
  mustChangePassword: z.boolean(),
  linearImportEnabled: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export type UserRecord = z.infer<typeof userRecordSchema>
