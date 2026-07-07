import type * as dotVotesHandlers from './handlers/dot-votes'
import type * as dotVotingSettingsHandlers from './handlers/dot-voting-settings'
import type * as itemsHandlers from './handlers/items'
import type * as propertyVotesHandlers from './handlers/property-votes'
import type * as propertyVotingSettingsHandlers from './handlers/property-voting-settings'
import type * as sessionLifecycleHandlers from './handlers/session-lifecycle'
import type * as sessionLockHandlers from './handlers/session-lock'
import type * as sessionRenameHandlers from './handlers/session-rename'
import type * as sharingHandlers from './handlers/sharing'
import type * as timelineHandlers from './handlers/timeline'
import type * as timelineSettingsHandlers from './handlers/timeline-settings'
import type * as votingPropertiesHandlers from './handlers/voting-properties'

export type SessionAgentMethods = {
  createItem: typeof itemsHandlers.createItem
  updateItem: typeof itemsHandlers.updateItem
  deleteItem: typeof itemsHandlers.deleteItem
  getItem: typeof itemsHandlers.getItem
  getAllItems: typeof itemsHandlers.getAllItems
  reorderItems: typeof itemsHandlers.reorderItems
  setRoadmapStatus: typeof timelineHandlers.setRoadmapStatus
  reorderTimelineItems: typeof timelineHandlers.reorderTimelineItems
  getItemsByStatus: typeof timelineHandlers.getItemsByStatus
  getAllItemsByStatus: typeof timelineHandlers.getAllItemsByStatus
  getTimelineSettings: typeof timelineSettingsHandlers.getTimelineSettings
  updateTimelineSettings: typeof timelineSettingsHandlers.updateTimelineSettings
  castDotVote: typeof dotVotesHandlers.castDotVote
  removeDotVote: typeof dotVotesHandlers.removeDotVote
  getDotVoteStats: typeof dotVotesHandlers.getDotVoteStats
  getCompleteDotStats: typeof dotVotesHandlers.getCompleteDotStats
  getDotVotes: typeof dotVotesHandlers.getDotVotes
  getDotVotingSettings: typeof dotVotingSettingsHandlers.getDotVotingSettings
  setDotVotingSettings: typeof dotVotingSettingsHandlers.setDotVotingSettings
  resetDotVotes: typeof dotVotingSettingsHandlers.resetDotVotes
  getSessionLock: typeof sessionLockHandlers.getSessionLock
  setSessionLock: typeof sessionLockHandlers.setSessionLock
  castPropertyVote: typeof propertyVotesHandlers.castPropertyVote
  removePropertyVote: typeof propertyVotesHandlers.removePropertyVote
  getPropertyVoteStats: typeof propertyVotesHandlers.getPropertyVoteStats
  getCompletePropertyStats: typeof propertyVotesHandlers.getCompletePropertyStats
  getPropertyVotes: typeof propertyVotesHandlers.getPropertyVotes
  createVotingProperty: typeof votingPropertiesHandlers.createVotingProperty
  updateVotingProperty: typeof votingPropertiesHandlers.updateVotingProperty
  deleteVotingProperty: typeof votingPropertiesHandlers.deleteVotingProperty
  getVotingProperty: typeof votingPropertiesHandlers.getVotingProperty
  getAllVotingProperties: typeof votingPropertiesHandlers.getAllVotingProperties
  reorderVotingProperties: typeof votingPropertiesHandlers.reorderVotingProperties
  getPropertyVotingSettings: typeof propertyVotingSettingsHandlers.getPropertyVotingSettings
  setPropertyVotingSettings: typeof propertyVotingSettingsHandlers.setPropertyVotingSettings
  shareWith: typeof sharingHandlers.shareWith
  removeShare: typeof sharingHandlers.removeShare
  getSharingInfo: typeof sharingHandlers.getSharingInfo
  checkAccess: typeof sharingHandlers.checkAccess
  destroySession: typeof sessionLifecycleHandlers.destroySession
  renameSession: typeof sessionRenameHandlers.renameSession
}
