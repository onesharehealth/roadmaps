export function getItemsChannelName(sessionUuid: string) {
  return `session:${sessionUuid}:items`
}

export function getTimelineChannelName(sessionUuid: string) {
  return `session:${sessionUuid}:timeline`
}

export function getDotVotesChannelName(sessionUuid: string) {
  return `session:${sessionUuid}:dot-votes`
}

export function getDotVotingSettingsChannelName(sessionUuid: string) {
  return `session:${sessionUuid}:dot-voting-settings`
}

export function getVotingPropertiesChannelName(sessionUuid: string) {
  return `session:${sessionUuid}:voting-properties`
}

export function getPropertyVotesChannelName(sessionUuid: string) {
  return `session:${sessionUuid}:property-votes`
}

export function getSharingChannelName(sessionUuid: string) {
  return `session:${sessionUuid}:sharing`
}

export function getGeneralChannelName(sessionUuid: string) {
  return `session:${sessionUuid}:general`
}

export const ITEMS_ACTIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  REORDER: 'reorder',
  GET_ALL: 'getAll',
} as const

export const ITEMS_EVENTS = {
  CREATED: 'created',
  UPDATED: 'updated',
  DELETED: 'deleted',
  REORDERED: 'reordered',
  ALL_ITEMS: 'allItems',
  ERROR: 'error',
} as const

export type ItemsAction = (typeof ITEMS_ACTIONS)[keyof typeof ITEMS_ACTIONS]
export type ItemsEvent = (typeof ITEMS_EVENTS)[keyof typeof ITEMS_EVENTS]

export const ROADMAP_TIMELINE_ACTIONS = {
  SET_STATUS: 'setStatus',
  REORDER_TIMELINE: 'reorderTimeline',
  GET_TIMELINE_ITEMS: 'getTimelineItems',
} as const

export const ROADMAP_TIMELINE_EVENTS = {
  STATUS_UPDATED: 'statusUpdated',
  TIMELINE_REORDERED: 'timelineReordered',
  TIMELINE_ITEMS: 'timelineItems',
  ERROR: 'error',
} as const

export type RoadmapTimelineAction =
  (typeof ROADMAP_TIMELINE_ACTIONS)[keyof typeof ROADMAP_TIMELINE_ACTIONS]
export type RoadmapTimelineEvent =
  (typeof ROADMAP_TIMELINE_EVENTS)[keyof typeof ROADMAP_TIMELINE_EVENTS]

export const DOT_VOTES_ACTIONS = {
  CAST: 'cast',
  REMOVE: 'remove',
  GET_STATS: 'getStats',
  GET_COMPLETE_STATS: 'getCompleteStats',
} as const

export const DOT_VOTES_EVENTS = {
  CAST_CONFIRMED: 'castConfirmed',
  REMOVE_CONFIRMED: 'removeConfirmed',
  STATS: 'stats',
  COMPLETE_STATS: 'completeStats',
  ERROR: 'error',
} as const

export type DotVotesAction =
  (typeof DOT_VOTES_ACTIONS)[keyof typeof DOT_VOTES_ACTIONS]
export type DotVotesEvent =
  (typeof DOT_VOTES_EVENTS)[keyof typeof DOT_VOTES_EVENTS]

export const DOT_VOTING_SETTINGS_ACTIONS = {
  GET_SETTINGS: 'getSettings',
  SET_SETTINGS: 'setSettings',
  RESET_VOTES: 'resetVotes',
} as const

export const DOT_VOTING_SETTINGS_EVENTS = {
  SETTINGS: 'settings',
  GET_SETTINGS_CONFIRMED: 'getSettingsConfirmed',
  SET_SETTINGS_CONFIRMED: 'setSettingsConfirmed',
  RESET_VOTES_CONFIRMED: 'resetVotesConfirmed',
  ERROR: 'error',
} as const

export type DotVotingSettingsAction =
  (typeof DOT_VOTING_SETTINGS_ACTIONS)[keyof typeof DOT_VOTING_SETTINGS_ACTIONS]
export type DotVotingSettingsEvent =
  (typeof DOT_VOTING_SETTINGS_EVENTS)[keyof typeof DOT_VOTING_SETTINGS_EVENTS]

export const VOTING_PROPERTIES_ACTIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  REORDER: 'reorder',
  GET_ALL: 'getAll',
} as const

export const VOTING_PROPERTIES_EVENTS = {
  CREATED: 'created',
  UPDATED: 'updated',
  DELETED: 'deleted',
  REORDERED: 'reordered',
  ALL_PROPERTIES: 'allProperties',
  ERROR: 'error',
} as const

export type VotingPropertiesAction =
  (typeof VOTING_PROPERTIES_ACTIONS)[keyof typeof VOTING_PROPERTIES_ACTIONS]
export type VotingPropertiesEvent =
  (typeof VOTING_PROPERTIES_EVENTS)[keyof typeof VOTING_PROPERTIES_EVENTS]

export const PROPERTY_VOTES_ACTIONS = {
  CAST: 'cast',
  REMOVE: 'remove',
  GET_STATS: 'getStats',
  GET_COMPLETE_STATS: 'getCompleteStats',
} as const

export const PROPERTY_VOTES_EVENTS = {
  CAST_CONFIRMED: 'castConfirmed',
  REMOVE_CONFIRMED: 'removeConfirmed',
  STATS: 'stats',
  COMPLETE_STATS: 'completeStats',
  ERROR: 'error',
} as const

export type PropertyVotesAction =
  (typeof PROPERTY_VOTES_ACTIONS)[keyof typeof PROPERTY_VOTES_ACTIONS]
export type PropertyVotesEvent =
  (typeof PROPERTY_VOTES_EVENTS)[keyof typeof PROPERTY_VOTES_EVENTS]

export const SHARING_ACTIONS = {
  GET_INFO: 'getInfo',
  SHARE_WITH: 'shareWith',
  REMOVE_SHARE: 'removeShare',
} as const

export const SHARING_EVENTS = {
  INFO: 'info',
  GET_INFO_CONFIRMED: 'getInfoConfirmed',
  SHARE_WITH_CONFIRMED: 'shareWithConfirmed',
  REMOVE_SHARE_CONFIRMED: 'removeShareConfirmed',
  ERROR: 'error',
} as const

export type SharingAction =
  (typeof SHARING_ACTIONS)[keyof typeof SHARING_ACTIONS]
export type SharingEvent = (typeof SHARING_EVENTS)[keyof typeof SHARING_EVENTS]

export const GENERAL_EVENTS = {
  NAME_UPDATED: 'nameUpdated',
  CONNECTED_USERS_UPDATED: 'connectedUsersUpdated',
  DOT_VOTING_SETTINGS_UPDATED: 'dotVotingSettingsUpdated',
  TIMELINE_SETTINGS_UPDATED: 'timelineSettingsUpdated',
  ERROR: 'error',
} as const

export type GeneralEvent = (typeof GENERAL_EVENTS)[keyof typeof GENERAL_EVENTS]
