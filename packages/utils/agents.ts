import type { DurableObjectState, SqlStorage } from '@cloudflare/workers-types'

import { dataError, type DataResult, dataSuccess } from './data'

type BaseAgentContext = {
  migrationLock: Lock
  sql: SqlStorage
  storage: DurableObjectState['storage']
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MigratableAgent<TContext extends BaseAgentContext = BaseAgentContext> = any & {
  context: TContext
}

export async function migrateAgent(
  this: MigratableAgent,
  {
    migrations,
    latestVersion,
    schemaTable,
  }: {
    migrations: Record<number, string>
    latestVersion: number
    schemaTable: 'schema_version' | 'shared_schema_version'
  },
): Promise<DataResult<{ version: number }>> {
  const context = this.context
  const name = `[${this.constructor.name}]`
  try {
    const version = await context.migrationLock.run(async () => {
      const currentVersion = getCurrentSchemaVersion(context.sql, schemaTable)

      if (currentVersion >= latestVersion) return { version: currentVersion }

      context.storage.transactionSync(() => {
        for (const version of Object.keys(migrations).map(Number)) {
          if (currentVersion < version) context.sql!.exec(migrations[version])
        }
      })

      return { version: latestVersion }
    })

    return dataSuccess(version)
  } catch (error) {
    return dataError(error instanceof Error ? error.message : 'Unknown error during migration')
  }
}

export function getCurrentSchemaVersion(
  sql: SqlStorage,
  schemaTable: 'schema_version' | 'shared_schema_version',
) {
  try {
    const tableExists = sql
      .exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='${schemaTable}'`)
      .one()

    if (!tableExists) return 0

    const version = sql.exec(`SELECT version FROM ${schemaTable} ORDER BY version DESC LIMIT 1`).one()
    return Number(version?.version ?? 0)
  } catch {
    return 0
  }
}

export class Lock {
  private promise?: Promise<void>

  async run<T>(fn: () => Promise<T>): Promise<T> {
    while (this.promise) await this.promise

    let resolve: () => void
    this.promise = new Promise((r) => (resolve = r))

    try {
      return await fn()
    } finally {
      resolve!()
      this.promise = undefined
    }
  }
}
