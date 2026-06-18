import { sharedMigrations } from 'utils'
import { Lock, migrateAgent } from 'utils/agents'
import { dataError, type DataResult, dataSuccess } from 'utils/data'
import { hashPassword } from 'utils/password'
import { zParse } from 'utils/zod'
import { BaseWebSocketAgent } from 'websockets/server'

import { SYSTEM_SCHEMA_VERSION, systemMigrations } from './migrations'
import { type UserRecord, userRecordSchema } from './schemas'

export type SystemAgentEnv = {
  BOOTSTRAP_ADMIN_EMAIL?: string
  BOOTSTRAP_ADMIN_PASSWORD?: string
}

type SystemState = { ready: boolean }

export class SystemAgent extends BaseWebSocketAgent<SystemAgentEnv, SystemState> {
  private migrationLock = new Lock()

  constructor(state: DurableObjectState, env: SystemAgentEnv) {
    super(state, env, { autoBroadcastConnectedUsers: false })
    this.ctx.blockConcurrencyWhile(async () => {
      await migrateAgent.call(this, {
        migrations: sharedMigrations,
        latestVersion: 1,
        schemaTable: 'shared_schema_version',
      })
      await migrateAgent.call(this, {
        migrations: systemMigrations,
        latestVersion: SYSTEM_SCHEMA_VERSION,
        schemaTable: 'schema_version',
      })
      await this.ensureBootstrapAdmin()
      await this.setState({ ready: true })
    })
  }

  protected getDefaultPrivateState() {
    return {}
  }

  get context() {
    return {
      migrationLock: this.migrationLock,
      sql: this.ctx.storage.sql,
      storage: this.ctx.storage,
    }
  }

  private async ensureBootstrapAdmin() {
    const count = this.ctx.storage.sql.exec(`SELECT COUNT(*) as c FROM users`).one() as { c: number }
    if (count.c > 0) return

    const email = this.env.BOOTSTRAP_ADMIN_EMAIL
    const password = this.env.BOOTSTRAP_ADMIN_PASSWORD
    if (!email || !password) {
      console.warn('[SystemAgent] No users and bootstrap env vars not set')
      return
    }

    const passwordHash = await hashPassword(password)
    const now = Math.floor(Date.now() / 1000)
    this.ctx.storage.sql.exec(
      `INSERT INTO users (email, password_hash, role, status, must_change_password, created_at, updated_at)
       VALUES (?, ?, 'app_admin', 'active', 1, ?, ?)`,
      email,
      passwordHash,
      now,
      now,
    )
  }

  async getUserByEmail(email: string): Promise<DataResult<UserRecord | null>> {
    const row = this.ctx.storage.sql.exec(`SELECT * FROM users WHERE email = ?`, email).toArray()[0]
    if (!row) return dataSuccess(null)
    return zParse(userRecordSchema, {
      email: row.email,
      passwordHash: row.password_hash,
      role: row.role,
      status: row.status,
      mustChangePassword: Boolean(row.must_change_password),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
  }

  async listUsers(): Promise<DataResult<UserRecord[]>> {
    const rows = this.ctx.storage.sql.exec(`SELECT * FROM users ORDER BY created_at ASC`).toArray()
    const users: UserRecord[] = []
    for (const row of rows) {
      const parsed = zParse(userRecordSchema, {
        email: row.email,
        passwordHash: row.password_hash,
        role: row.role,
        status: row.status,
        mustChangePassword: Boolean(row.must_change_password),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })
      if (parsed.ok) users.push(parsed.body)
    }
    return dataSuccess(users)
  }

  async createUser({
    email,
    passwordHash,
    role = 'user',
    mustChangePassword = false,
  }: {
    email: string
    passwordHash: string
    role?: 'app_admin' | 'user'
    mustChangePassword?: boolean
  }): Promise<DataResult<UserRecord>> {
    const now = Math.floor(Date.now() / 1000)
    try {
      this.ctx.storage.sql.exec(
        `INSERT INTO users (email, password_hash, role, status, must_change_password, created_at, updated_at)
         VALUES (?, ?, ?, 'active', ?, ?, ?)`,
        email,
        passwordHash,
        role,
        mustChangePassword ? 1 : 0,
        now,
        now,
      )
    } catch {
      return dataError('User already exists')
    }
    const user = await this.getUserByEmail(email)
    if (!user.ok || !user.body) return dataError('Failed to create user')
    return dataSuccess(user.body)
  }

  async updatePassword({
    email,
    passwordHash,
    clearMustChange = true,
  }: {
    email: string
    passwordHash: string
    clearMustChange?: boolean
  }): Promise<DataResult<void>> {
    const now = Math.floor(Date.now() / 1000)
    this.ctx.storage.sql.exec(
      `UPDATE users SET password_hash = ?, must_change_password = ?, updated_at = ? WHERE email = ?`,
      passwordHash,
      clearMustChange ? 0 : 1,
      now,
      email,
    )
    return dataSuccess()
  }

  async setUserStatus(email: string, status: 'active' | 'deactivated'): Promise<DataResult<void>> {
    const now = Math.floor(Date.now() / 1000)
    this.ctx.storage.sql.exec(`UPDATE users SET status = ?, updated_at = ? WHERE email = ?`, status, now, email)
    return dataSuccess()
  }

  async deleteUser(email: string): Promise<DataResult<void>> {
    this.ctx.storage.sql.exec(`DELETE FROM users WHERE email = ?`, email)
    this.ctx.storage.sql.exec(`DELETE FROM user_invites WHERE email = ?`, email)
    this.ctx.storage.sql.exec(`DELETE FROM password_reset_tokens WHERE email = ?`, email)
    return dataSuccess()
  }

  async createInvite({
    token,
    email,
    invitedBy,
    teamId,
    expiresAt,
  }: {
    token: string
    email: string
    invitedBy: string
    teamId?: string | null
    expiresAt: number
  }): Promise<DataResult<void>> {
    this.ctx.storage.sql.exec(
      `INSERT INTO user_invites (token, email, invited_by, team_id, expires_at) VALUES (?, ?, ?, ?, ?)`,
      token,
      email,
      invitedBy,
      teamId ?? null,
      expiresAt,
    )
    return dataSuccess()
  }

  async getInvite(token: string) {
    const row = this.ctx.storage.sql
      .exec(`SELECT * FROM user_invites WHERE token = ? AND consumed_at IS NULL`, token)
      .one()
    if (!row) return dataError('Invalid invite')
    if (Number(row.expires_at) < Math.floor(Date.now() / 1000)) return dataError('Invite expired')
    return dataSuccess({
      email: row.email as string,
      invitedBy: row.invited_by as string,
      teamId: row.team_id as string | null,
    })
  }

  async consumeInvite(token: string) {
    const row = this.ctx.storage.sql
      .exec(`SELECT * FROM user_invites WHERE token = ? AND consumed_at IS NULL`, token)
      .one()
    if (!row) return dataError('Invalid invite')
    if (Number(row.expires_at) < Math.floor(Date.now() / 1000)) return dataError('Invite expired')
    const now = Math.floor(Date.now() / 1000)
    this.ctx.storage.sql.exec(`UPDATE user_invites SET consumed_at = ? WHERE token = ?`, now, token)
    return dataSuccess({
      email: row.email as string,
      invitedBy: row.invited_by as string,
      teamId: row.team_id as string | null,
    })
  }

  async createPasswordResetToken({
    token,
    email,
    expiresAt,
  }: {
    token: string
    email: string
    expiresAt: number
  }): Promise<DataResult<void>> {
    this.ctx.storage.sql.exec(`DELETE FROM password_reset_tokens WHERE email = ?`, email)
    this.ctx.storage.sql.exec(
      `INSERT INTO password_reset_tokens (token, email, expires_at) VALUES (?, ?, ?)`,
      token,
      email,
      expiresAt,
    )
    return dataSuccess()
  }

  async consumePasswordResetToken(token: string) {
    const row = this.ctx.storage.sql.exec(`SELECT * FROM password_reset_tokens WHERE token = ?`, token).one()
    if (!row) return dataError('Invalid token')
    if (Number(row.expires_at) < Math.floor(Date.now() / 1000)) return dataError('Token expired')
    this.ctx.storage.sql.exec(`DELETE FROM password_reset_tokens WHERE token = ?`, token)
    return dataSuccess({ email: row.email as string })
  }
}
