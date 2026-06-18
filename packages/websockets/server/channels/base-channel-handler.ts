import { z } from 'zod'

import type {
  ActionHandlerFunction,
  ChannelContext,
  ChannelHandler,
  ValidatorFunction,
} from '../types'

/**
 * Base channel handler that provides common validation patterns
 *
 * Provides a complete handle method implementation and validation utilities.
 * Subclasses only need to define their action handlers map and individual handler methods.
 *
 * @template TAction - Union type of valid action strings for type safety
 * @template THandlers - Type of the action handlers map
 *
 * Usage:
 * ```typescript
 * type MyActions = 'create' | 'update' | 'delete'
 *
 * type MyHandlers = {
 *   [K in MyActions]: ActionHandlerFunction<MyActions>
 * }
 *
 * export class MyChannelHandler extends BaseChannelHandler<MyActions, MyHandlers> {
 *   protected readonly actionHandlers: MyHandlers = {
 *     create: this.handleCreate.bind(this),
 *     update: this.handleUpdate.bind(this),
 *     delete: this.handleDelete.bind(this),
 *   }
 *
 *   private async handleCreate(validate: ValidatorFunction<MyActions>, channel: ChannelContext): Promise<void> {
 *     await validate({
 *       action: 'create', // ✅ Type-safe! Only MyActions allowed
 *       inputSchema: CreateSchema,
 *       agentMethod: (data) => this.agent.create(data),
 *       onSuccess: async (data, result) => {
 *         channel.reply('success', { result })
 *       },
 *       // Optional: Custom error handling
 *       onError: async (error, { action, payload, channel }) => {
 *         if (error instanceof SomeSpecificError) {
 *           channel.reply('customError', { type: 'specific', message: error.message })
 *         } else {
 *           // Re-throw to use default error handling
 *           throw error
 *         }
 *       }
 *     })
 *   }
 *
 *   // ... other handler methods
 * }
 * ```
 */
export abstract class BaseChannelHandler<
  TAction extends string = string,
  THandlers extends Record<TAction, ActionHandlerFunction<TAction>> = Record<
    TAction,
    ActionHandlerFunction<TAction>
  >,
> implements ChannelHandler
{
  /**
   * Action handlers map - must be implemented by subclasses
   */
  protected abstract readonly actionHandlers: THandlers

  /**
   * Handle incoming channel messages - implemented in base class
   */
  async handle(
    context: ChannelContext,
    action: string,
    payload?: unknown,
  ): Promise<void> {
    const typedAction = action as TAction
    const handler = this.actionHandlers[typedAction]

    if (!handler) {
      this.sendError(context, `Unknown action: ${action}`, {
        availableActions: Object.keys(this.actionHandlers),
      })
      return
    }

    // Create validator once and pass it to the handler
    const validate = this.createValidator(context, payload)
    await handler(validate, context)
  }

  /**
   * Create a bound validator for the specific channel and payload
   * Eliminates the need to pass channel/payload repeatedly while maintaining concurrency safety
   */
  protected createValidator(
    channel: ChannelContext,
    payload: unknown,
  ): ValidatorFunction<TAction> {
    return async <T, R = unknown>({
      inputSchema,
      agentMethod,
      onSuccess,
      onError,
      action,
      requiredPermission,
    }: {
      inputSchema: z.ZodSchema<T>
      agentMethod: (
        validatedPayload: T,
      ) => Promise<{ ok: true; body: R } | { ok: false; errors: string[] }>
      onSuccess: (
        validatedPayload: T,
        result: { ok: true; body: R },
      ) => Promise<void>
      onError?: (
        error: unknown,
        context: { action: TAction; payload: unknown; channel: ChannelContext },
      ) => Promise<void>
      action: TAction
      requiredPermission?: string
    }): Promise<void> => {
      try {
        // Permission check (if required)
        if (requiredPermission) {
          const hasPermission = await this.checkPermission(
            channel,
            requiredPermission,
          )
          if (!hasPermission) {
            const permissionError = new Error('Permission denied') as Error & {
              code?: string
            }
            permissionError.code = 'PERMISSION_DENIED'
            await this.handleError(permissionError, {
              action,
              payload,
              channel,
              onError,
            })
            return
          }
        }

        const validatedPayload = inputSchema.parse(payload)
        const result = await agentMethod(validatedPayload)

        if (result.ok) {
          // TypeScript now knows result is { ok: true; body: R }
          await onSuccess(validatedPayload, result)
        } else {
          // TypeScript now knows result is { ok: false; errors: string[] }
          const operationalError = new Error(
            result.errors.join(', ') || 'Operation failed',
          )
          await this.handleError(operationalError, {
            action,
            payload,
            channel,
            onError,
          })
        }
      } catch (error) {
        // Validation error, parsing error, or unexpected error
        await this.handleError(error, { action, payload, channel, onError })
      }
    }
  }

  /**
   * Check if the user has permission for an action
   * Override this method in subclasses to implement permission checking
   */
  protected checkPermission(
    channel: ChannelContext,
    permission: string,
  ): boolean {
    // Default implementation: no permission checking
    // Subclasses should override this to implement actual permission checks
    return true
  }

  /**
   * Centralized error handling - calls custom onError if provided, falls back to default
   */
  private async handleError(
    error: unknown,
    context: {
      action: TAction
      payload: unknown
      channel: ChannelContext
      onError?: (
        error: unknown,
        context: { action: TAction; payload: unknown; channel: ChannelContext },
      ) => Promise<void>
    },
  ): Promise<void> {
    if (context.onError) {
      try {
        // Try custom error handler first
        await context.onError(error, {
          action: context.action,
          payload: context.payload,
          channel: context.channel,
        })
        return // Custom handler succeeded, we're done
      } catch (customError) {
        // Custom error handler failed, log it and fall through to default handling
        console.error(
          `[BaseChannelHandler] Custom error handler failed for action '${context.action}':`,
          customError,
        )
      }
    }

    // Default error handling
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map(
        (err) => `${err.path.join('.')}: ${err.message}`,
      )
      this.sendError(
        context.channel,
        `Invalid payload: ${errorMessages.join(', ')}`,
        { action: context.action },
      )
    } else {
      const message =
        error instanceof Error ? error.message : `Failed to ${context.action}`
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? String(error.code)
          : undefined
      this.sendError(context.channel, message, { action: context.action, code })
    }
  }

  /**
   * Centralized error response helper
   * Override this method to customize error handling for your channel
   */
  protected sendError(
    channel: ChannelContext,
    message: string,
    options: {
      action?: string
      availableActions?: string[]
      code?: string
    } = {},
  ): void {
    // Use validated reply for consistent error handling
    const errorPayload = {
      message,
      ...options,
    }

    channel.reply('error', errorPayload)
  }
}
