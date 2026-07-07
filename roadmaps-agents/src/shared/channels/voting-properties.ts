import type { ActionHandlerFunction, ChannelContext, ValidatorFunction } from 'websockets/server'
import { z } from 'zod'

import { VOTING_PROPERTIES_ACTIONS, VOTING_PROPERTIES_EVENTS, type VotingPropertiesAction } from '../channels'
import {
  createVotingPropertySchema,
  deleteVotingPropertySchema,
  reorderVotingPropertiesSchema,
  updateVotingPropertySchema,
  type VotingProperty,
} from '../session-schemas'
import { BaseSessionChannelHandler } from './base-session-channel-handler'
import { withActingUser } from './with-acting-user'

const getAllVotingPropertiesSchema = z.object({}).optional().default({})

type VotingPropertiesActionHandlers = {
  [K in VotingPropertiesAction]: ActionHandlerFunction<VotingPropertiesAction>
}

export class VotingPropertiesChannelHandler extends BaseSessionChannelHandler<
  VotingPropertiesAction,
  VotingPropertiesActionHandlers
> {
  protected readonly actionHandlers: VotingPropertiesActionHandlers = {
    [VOTING_PROPERTIES_ACTIONS.CREATE]: this.handleCreate.bind(this),
    [VOTING_PROPERTIES_ACTIONS.UPDATE]: this.handleUpdate.bind(this),
    [VOTING_PROPERTIES_ACTIONS.DELETE]: this.handleDelete.bind(this),
    [VOTING_PROPERTIES_ACTIONS.REORDER]: this.handleReorder.bind(this),
    [VOTING_PROPERTIES_ACTIONS.GET_ALL]: this.handleGetAll.bind(this),
  }

  private async handleCreate(validate: ValidatorFunction<VotingPropertiesAction>, channel: ChannelContext) {
    await validate({
      action: VOTING_PROPERTIES_ACTIONS.CREATE,
      inputSchema: createVotingPropertySchema,
      agentMethod: (payload) => this.agent.createVotingProperty(withActingUser(channel, payload)),
      onSuccess: async (_payload, result) => {
        await channel.broadcast<{ property: VotingProperty }>(VOTING_PROPERTIES_EVENTS.CREATED, {
          property: result.body,
        })
      },
    })
  }

  private async handleUpdate(validate: ValidatorFunction<VotingPropertiesAction>, channel: ChannelContext) {
    await validate({
      action: VOTING_PROPERTIES_ACTIONS.UPDATE,
      inputSchema: updateVotingPropertySchema,
      agentMethod: (payload) => this.agent.updateVotingProperty(withActingUser(channel, payload)),
      onSuccess: async (_payload, result) => {
        await channel.broadcast<{ property: VotingProperty }>(VOTING_PROPERTIES_EVENTS.UPDATED, {
          property: result.body,
        })
      },
    })
  }

  private async handleDelete(validate: ValidatorFunction<VotingPropertiesAction>, channel: ChannelContext) {
    await validate({
      action: VOTING_PROPERTIES_ACTIONS.DELETE,
      inputSchema: deleteVotingPropertySchema,
      agentMethod: (payload) => this.agent.deleteVotingProperty(withActingUser(channel, payload)),
      onSuccess: async (payload) => {
        await channel.broadcast<{ propertyUuid: string }>(VOTING_PROPERTIES_EVENTS.DELETED, {
          propertyUuid: payload.propertyUuid,
        })
      },
    })
  }

  private async handleReorder(validate: ValidatorFunction<VotingPropertiesAction>, channel: ChannelContext) {
    await validate({
      action: VOTING_PROPERTIES_ACTIONS.REORDER,
      inputSchema: reorderVotingPropertiesSchema,
      agentMethod: (payload) => this.agent.reorderVotingProperties(withActingUser(channel, payload)),
      onSuccess: async (_payload, result) => {
        await channel.broadcast<{ properties: VotingProperty[] }>(VOTING_PROPERTIES_EVENTS.REORDERED, {
          properties: result.body,
        })
      },
    })
  }

  private async handleGetAll(validate: ValidatorFunction<VotingPropertiesAction>, channel: ChannelContext) {
    await validate({
      action: VOTING_PROPERTIES_ACTIONS.GET_ALL,
      inputSchema: getAllVotingPropertiesSchema,
      agentMethod: () => this.agent.getAllVotingProperties({ userId: channel.userId }),
      onSuccess: async (_payload, result) => {
        channel.reply<{ properties: VotingProperty[] }>(VOTING_PROPERTIES_EVENTS.ALL_PROPERTIES, {
          properties: result.body,
        })
      },
    })
  }
}
