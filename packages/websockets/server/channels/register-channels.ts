import type { BaseWebSocketAgentHost } from '../base-websocket-agent-host'
import { TestChannelHandler } from '../channels/test-channel-handler'

export function registerChannelsImpl<
  Env extends Cloudflare.Env,
  State,
  PrivateState,
>(host: BaseWebSocketAgentHost<Env, State, PrivateState>): void {
  // Register the built-in test channel (idempotent)
  if (!host.channelRouter.getRegisteredChannels().includes('test')) {
    host.channelRouter.register('test', new TestChannelHandler())
  }

  // If channelDefinitions were provided, register them based on state identifier
  if (host.wsOptions.channelDefinitions && host.wsOptions.getStateIdentifier) {
    // Safely get state identifier, only if state is present
    const stateIdentifier = host.state
      ? host.wsOptions.getStateIdentifier(host.state)
      : null

    // Only register UUID-based channels if state identifier is available
    if (!stateIdentifier) {
      return
    }

    // Register all configured channels
    for (const { nameFn, Handler } of host.wsOptions.channelDefinitions) {
      const channelName = nameFn(stateIdentifier)

      // Only register if not already registered (idempotent)
      if (!host.channelRouter.getRegisteredChannels().includes(channelName)) {
        host.channelRouter.register(channelName, new Handler(host))
      }
    }
  }
}
