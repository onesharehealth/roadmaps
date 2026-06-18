import type { ActionHandlerFunction, ChannelContext, ValidatorFunction } from 'websockets/server'
import { z } from 'zod'

import { ITEMS_ACTIONS, ITEMS_EVENTS, type ItemsAction } from '../channels'
import {
  createRoadmapItemSchema,
  reorderRoadmapItemsSchema,
  type RoadmapItem,
  updateRoadmapItemSchema,
} from '../session-schemas'
import { BaseSessionChannelHandler } from './base-session-channel-handler'
import { withActingUser } from './with-acting-user'

const deleteItemSchema = z.object({
  itemUuid: z.string().uuid(),
})

const getAllItemsSchema = z.object({}).optional().default({})

type ItemsActionHandlers = {
  [K in ItemsAction]: ActionHandlerFunction<ItemsAction>
}

export class ItemsChannelHandler extends BaseSessionChannelHandler<ItemsAction, ItemsActionHandlers> {
  protected readonly actionHandlers: ItemsActionHandlers = {
    [ITEMS_ACTIONS.CREATE]: this.handleCreate.bind(this),
    [ITEMS_ACTIONS.UPDATE]: this.handleUpdate.bind(this),
    [ITEMS_ACTIONS.DELETE]: this.handleDelete.bind(this),
    [ITEMS_ACTIONS.REORDER]: this.handleReorder.bind(this),
    [ITEMS_ACTIONS.GET_ALL]: this.handleGetAll.bind(this),
  }

  private async handleCreate(validate: ValidatorFunction<ItemsAction>, channel: ChannelContext) {
    await validate({
      action: ITEMS_ACTIONS.CREATE,
      inputSchema: createRoadmapItemSchema,
      agentMethod: (payload) => this.agent.createItem(withActingUser(channel, payload)),
      onSuccess: async () => {
        channel.reply('ack', { action: ITEMS_ACTIONS.CREATE })
      },
    })
  }

  private async handleUpdate(validate: ValidatorFunction<ItemsAction>, channel: ChannelContext) {
    await validate({
      action: ITEMS_ACTIONS.UPDATE,
      inputSchema: updateRoadmapItemSchema,
      agentMethod: (payload) => this.agent.updateItem(withActingUser(channel, payload)),
      onSuccess: async () => {
        channel.reply('ack', { action: ITEMS_ACTIONS.UPDATE })
      },
    })
  }

  private async handleDelete(validate: ValidatorFunction<ItemsAction>, channel: ChannelContext) {
    await validate({
      action: ITEMS_ACTIONS.DELETE,
      inputSchema: deleteItemSchema,
      agentMethod: (payload) =>
        this.agent.deleteItem({
          itemUuid: payload.itemUuid,
          userId: channel.userId,
        }),
      onSuccess: async () => {
        channel.reply('ack', { action: ITEMS_ACTIONS.DELETE })
      },
    })
  }

  private async handleReorder(validate: ValidatorFunction<ItemsAction>, channel: ChannelContext) {
    await validate({
      action: ITEMS_ACTIONS.REORDER,
      inputSchema: reorderRoadmapItemsSchema,
      agentMethod: (payload) => this.agent.reorderItems(withActingUser(channel, payload)),
      onSuccess: async () => {
        channel.reply('ack', { action: ITEMS_ACTIONS.REORDER })
      },
    })
  }

  private async handleGetAll(validate: ValidatorFunction<ItemsAction>, channel: ChannelContext) {
    await validate({
      action: ITEMS_ACTIONS.GET_ALL,
      inputSchema: getAllItemsSchema,
      agentMethod: () => this.agent.getAllItems(),
      onSuccess: async (_payload, result) => {
        channel.reply<{ items: RoadmapItem[] }>(ITEMS_EVENTS.ALL_ITEMS, {
          items: result.body,
        })
      },
    })
  }
}
