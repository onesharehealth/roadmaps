import type { BaseWebSocketAgentHost } from '../base-websocket-agent-host'
import { PRIVATE_STATE_KEY } from '../base-websocket-agent-host'

export function getPrivateStateImpl<
  Env extends Cloudflare.Env,
  State,
  PrivateState,
>(host: BaseWebSocketAgentHost<Env, State, PrivateState>): PrivateState {
  // Cast storage to any to access standard SQLite KV API if types are missing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const storage = host.ctx.storage as any

  // Check if synchronous KV is available (Cloudflare Durable Objects with SQLite)
  if (storage.kv) {
    const stored = storage.kv.get(host.PRIVATE_STATE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<PrivateState>
      // Merge with default state to ensure all required fields are present
      // This handles cases where stored data is missing fields (e.g., after schema changes)
      return { ...host.getDefaultPrivateState(), ...parsed }
    }
  }

  return host.getDefaultPrivateState()
}

export function setPrivateStateImpl<
  Env extends Cloudflare.Env,
  State,
  PrivateState,
>(
  host: BaseWebSocketAgentHost<Env, State, PrivateState>,
  state: PrivateState,
): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const storage = host.ctx.storage as any
  if (storage.kv) {
    storage.kv.put(PRIVATE_STATE_KEY, JSON.stringify(state))
  } else {
    console.warn(
      '[BaseWebSocketAgent] Synchronous KV storage not available for setPrivateState',
    )
  }
}

export function setPrivateStatePartialImpl<
  Env extends Cloudflare.Env,
  State,
  PrivateState,
>(
  host: BaseWebSocketAgentHost<Env, State, PrivateState>,
  state: Partial<PrivateState>,
): void {
  const currentState = host.getPrivateState()
  host.setPrivateState({ ...currentState, ...state })
}

export async function setPublicStatePartialImpl<
  Env extends Cloudflare.Env,
  State,
  PrivateState,
>(
  host: BaseWebSocketAgentHost<Env, State, PrivateState>,
  state: Partial<State>,
): Promise<void> {
  const newState = { ...host.state, ...state }
  await host.setState(newState)
  host.onStateChanged()
}
