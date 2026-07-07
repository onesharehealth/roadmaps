import { z } from 'zod'

import { sharePermissionSchema } from './types'

export const DEFAULT_DOT_VOTING_DOTS_PER_VOTER = 3

export const PROPERTY_VOTE_VALUES = {
  MINIMUM: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  MAXIMUM: 4,
} as const

export const PROPERTY_VOTE_LABELS = {
  [PROPERTY_VOTE_VALUES.MINIMUM]: 'min',
  [PROPERTY_VOTE_VALUES.LOW]: 'low',
  [PROPERTY_VOTE_VALUES.MEDIUM]: 'medium',
  [PROPERTY_VOTE_VALUES.HIGH]: 'high',
  [PROPERTY_VOTE_VALUES.MAXIMUM]: 'max',
} as const

export const PROPERTY_VOTE_LABEL_TO_VALUE = {
  min: PROPERTY_VOTE_VALUES.MINIMUM,
  low: PROPERTY_VOTE_VALUES.LOW,
  medium: PROPERTY_VOTE_VALUES.MEDIUM,
  high: PROPERTY_VOTE_VALUES.HIGH,
  max: PROPERTY_VOTE_VALUES.MAXIMUM,
} as const

export type PropertyVoteLabel = keyof typeof PROPERTY_VOTE_LABEL_TO_VALUE
export type PropertyVoteValue = (typeof PROPERTY_VOTE_VALUES)[keyof typeof PROPERTY_VOTE_VALUES]

export const ROADMAP_STATUS = {
  UNADDRESSED: 'unaddressed',
  ASSIGNED: 'assigned',
  COMPLETED: 'completed',
} as const

export const roadmapStatusSchema = z.enum(['unaddressed', 'assigned', 'completed'])
export type RoadmapStatus = z.infer<typeof roadmapStatusSchema>

export const itemLabelSchema = z.object({
  id: z.number(),
  itemUuid: z.string().uuid(),
  text: z.string(),
  color: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export const itemLabelsSchema = z.array(itemLabelSchema)
export type ItemLabel = z.infer<typeof itemLabelSchema>

export const createItemLabelSchema = z.object({
  text: z.string().min(1),
  color: z.string().min(1),
})

export const roadmapItemSchema = z.object({
  uuid: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  displayOrder: z.number(),
  roadmapStatus: roadmapStatusSchema,
  roadmapOrder: z.number().nullable(),
  durationWeeks: z.number().nullable(),
  externalId: z.string().nullable(),
  estimate: z.number().nullable(),
  externalContent: z.string().nullable(),
  labels: itemLabelsSchema,
  createdBy: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export const roadmapItemsSchema = z.array(roadmapItemSchema)
export type RoadmapItem = z.infer<typeof roadmapItemSchema>

export const createRoadmapItemSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  externalId: z.string().optional(),
  estimate: z.number().optional(),
  externalContent: z.string().optional(),
  labels: createItemLabelSchema.array().optional(),
})

export const createRoadmapItemInputSchema = createRoadmapItemSchema.extend({
  userId: z.string().email(),
})

export const updateRoadmapItemSchema = z.object({
  itemUuid: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  externalId: z.string().optional(),
  estimate: z.number().nullable().optional(),
  externalContent: z.string().optional(),
  labels: createItemLabelSchema.array().optional(),
  durationWeeks: z.number().int().min(1).max(6).optional(),
})

export const reorderRoadmapItemsSchema = z.object({
  itemOrders: z.array(
    z.object({
      uuid: z.string().uuid(),
      displayOrder: z.number(),
    }),
  ),
})

export const setRoadmapStatusSchema = z.object({
  itemUuid: z.string().uuid(),
  status: roadmapStatusSchema,
})

export const setRoadmapStatusInputSchema = setRoadmapStatusSchema.extend({
  userId: z.string().email(),
})

export const reorderTimelineItemsSchema = z.object({
  itemOrders: z.array(
    z.object({
      uuid: z.string().uuid(),
      roadmapOrder: z.number(),
    }),
  ),
})

export const roadmapTimelineSettingsSchema = z.object({
  cycleLengthWeeks: z.number().int().min(1),
  cooldownWeeks: z.number().int().min(0),
  startDate: z.string(),
  cycleStartNumber: z.number().int().min(1),
})

export const updateRoadmapTimelineSettingsSchema = z.object({
  cycleLengthWeeks: z.number().int().min(1).optional(),
  cooldownWeeks: z.number().int().min(0).optional(),
  startDate: z.string().optional(),
  cycleStartNumber: z.number().int().min(1).optional(),
})

export type RoadmapTimelineSettings = z.infer<typeof roadmapTimelineSettingsSchema>
export type UpdateRoadmapTimelineSettings = z.infer<typeof updateRoadmapTimelineSettingsSchema>

export const dotVoteSchema = z.object({
  id: z.number(),
  itemUuid: z.string().uuid(),
  username: z.string(),
  dotPositionX: z.number(),
  dotPositionY: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export const dotVotesSchema = z.array(dotVoteSchema)
export type DotVote = z.infer<typeof dotVoteSchema>

export const castDotVoteSchema = z.object({
  itemUuid: z.string().uuid(),
  dotPositionX: z.number(),
  dotPositionY: z.number(),
})

export const castDotVoteInputSchema = castDotVoteSchema.extend({
  userId: z.string().email(),
})

export const removeDotVoteSchema = z.object({
  itemUuid: z.string().uuid(),
  dotPositionX: z.number(),
  dotPositionY: z.number(),
})

export const removeDotVoteInputSchema = removeDotVoteSchema.extend({
  userId: z.string().email(),
})

export const removePropertyVoteSchema = z.object({
  propertyUuid: z.string().uuid(),
  itemUuid: z.string().uuid(),
})

export const removePropertyVoteInputSchema = removePropertyVoteSchema.extend({
  userId: z.string().email(),
})

export const deleteVotingPropertySchema = z.object({
  propertyUuid: z.string().uuid(),
})

export const deleteVotingPropertyInputSchema = deleteVotingPropertySchema.extend({
  userId: z.string().email(),
})

export const reorderTimelineItemsInputSchema = reorderTimelineItemsSchema.extend({
  userId: z.string().email(),
})

export const dotVoteStatsSchema = z.object({
  itemUuid: z.string().uuid(),
  votes: z.array(dotVoteSchema),
  totalVotes: z.number(),
  userVotes: z.array(dotVoteSchema),
})

export const completeDotStatsSchema = z.object({
  itemStats: z.array(dotVoteStatsSchema),
  totalVoters: z.number(),
  participationByItem: z.record(z.string(), z.number()),
  dotsPerVoter: z.number(),
})

export type DotVoteStats = z.infer<typeof dotVoteStatsSchema>
export type CompleteDotStats = z.infer<typeof completeDotStatsSchema>
export type CastDotVote = z.infer<typeof castDotVoteSchema>

export const votingPropertySchema = z.object({
  uuid: z.string().uuid(),
  name: z.string(),
  displayOrder: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export const votingPropertiesSchema = z.array(votingPropertySchema)
export type VotingProperty = z.infer<typeof votingPropertySchema>

export const createVotingPropertySchema = z.object({
  name: z.string().min(1),
})

export const createVotingPropertyInputSchema = createVotingPropertySchema.extend({
  userId: z.string().email(),
})

export const updateVotingPropertySchema = z.object({
  propertyUuid: z.string().uuid(),
  name: z.string().min(1),
})

export const reorderVotingPropertiesSchema = z.object({
  propertyOrders: z.array(
    z.object({
      uuid: z.string().uuid(),
      displayOrder: z.number(),
    }),
  ),
})

export const propertyVoteSchema = z.object({
  propertyUuid: z.string().uuid(),
  itemUuid: z.string().uuid(),
  username: z.string(),
  value: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export const propertyVotesSchema = z.array(propertyVoteSchema)
export type PropertyVote = z.infer<typeof propertyVoteSchema>

export const castPropertyVoteSchema = z.object({
  propertyUuid: z.string().uuid(),
  itemUuid: z.string().uuid(),
  value: z.number(),
})

export const castPropertyVoteInputSchema = castPropertyVoteSchema.extend({
  userId: z.string().email(),
})

export const propertyVoteStatsSchema = z.object({
  propertyUuid: z.string().uuid(),
  itemUuid: z.string().uuid(),
  votes: z.array(propertyVoteSchema),
  average: z.number(),
  min: z.number(),
  max: z.number(),
  totalVotes: z.number(),
  userVote: propertyVoteSchema.nullable(),
})

export const completePropertyStatsSchema = z.object({
  propertyUuid: z.string().uuid(),
  itemStats: z.array(propertyVoteStatsSchema),
  totalVoters: z.number(),
  participationByItem: z.record(z.string(), z.number()),
})

export type PropertyVoteStats = z.infer<typeof propertyVoteStatsSchema>
export type CompletePropertyStats = z.infer<typeof completePropertyStatsSchema>
export type CastPropertyVote = z.infer<typeof castPropertyVoteSchema>

export const getDotVotingSettingsSchema = z.object({})

export const setDotVotingSettingsSchema = z.object({
  dotsPerVoter: z.number().int().min(1).max(1000),
})

export const resetDotVotesSchema = z.object({})

export const dotVotingSettingsSchema = z.object({
  dotsPerVoter: z.number().int().min(1),
})

export type DotVotingSettings = z.infer<typeof dotVotingSettingsSchema>

export const sessionLockStateSchema = z.object({
  isLocked: z.boolean(),
  lockedAt: z.number().nullable(),
})

export type SessionLockState = z.infer<typeof sessionLockStateSchema>

export const getSessionLockSchema = z.object({})

export const setSessionLockSchema = z.object({
  isLocked: z.boolean(),
})

export const DEFAULT_REQUIRE_ALL_VOTERS_PRESENT = true

export const propertyVotingSettingsSchema = z.object({
  requireAllVotersPresent: z.boolean(),
})

export type PropertyVotingSettings = z.infer<typeof propertyVotingSettingsSchema>

export const getPropertyVotingSettingsSchema = z.object({})

export const setPropertyVotingSettingsSchema = z.object({
  requireAllVotersPresent: z.boolean(),
})

export const shareWithSchema = z.object({
  shareWithEmail: z.string().email(),
  permission: sharePermissionSchema.optional().default('read'),
})

export const shareWithInputSchema = shareWithSchema.extend({
  userId: z.string().email(),
})

export const removeShareSchema = z.object({
  removeEmail: z.string().email(),
})

export const removeShareInputSchema = removeShareSchema.extend({
  userId: z.string().email(),
})

export const getSharingInfoSchema = z.object({})

export const sharingInfoSchema = z.object({
  ownerEmail: z.string().email(),
  sharedWith: z.array(
    z.object({
      email: z.string().email(),
      permission: sharePermissionSchema,
      sharedAt: z.number(),
    }),
  ),
})

export type SharingInfo = z.infer<typeof sharingInfoSchema>

export const sessionPublicStateSchema = z.object({
  uuid: z.string().uuid(),
  name: z.string(),
  sessionType: z.enum(['timeline', 'dot_voting', 'property_voting']),
  ownerEmail: z.string().email(),
  teamId: z.string().nullable(),
})

export type SessionPublicState = z.infer<typeof sessionPublicStateSchema>

export type SessionPrivateState = {
  sharedWith: Record<string, { email: string; permission: 'read' | 'write'; sharedAt: number }>
  timelineCycleLengthWeeks?: number
  timelineCooldownWeeks?: number
  timelineStartDate?: string | null
  timelineCycleStartNumber?: number
  dotVotingDotsPerVoter?: number
  isLocked?: boolean
  lockedAt?: number | null
  requireAllVotersPresent?: boolean
}
