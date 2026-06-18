export function bindHandlersToPrototype<T extends object>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  agentClass: new (...args: any[]) => T,
  handlerModule: Record<string, unknown>,
  _modulePrefix?: string,
): void {
  for (const [name, fn] of Object.entries(handlerModule)) {
    if (typeof fn === 'function') {
      // Add method to prototype (not instance) for RPC compatibility
      // Dynamic prototype assignment is necessary for RPC to work
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(agentClass.prototype as any)[name] = async function (
        this: T,
        ...args: unknown[]
      ) {
        // Call migrate if it exists on the instance
        if ('migrate' in this && typeof this.migrate === 'function') {
          await this.migrate()
        }
        return await fn.call(this, ...args)
      }
    }
  }
}
