# Security

Roadmaps is a multi-tenant collaborative app on Cloudflare Workers. Authorization is enforced on every mutating path; UI gates are defense in depth only.

## Authentication

- **Sessions:** HTTP-only, signed cookies (`__roadmaps_session`), `SameSite=Lax`, `Secure` outside development.
- **Active users only:** Each request re-validates the user against the system agent. Deactivated accounts lose access immediately (session cookie alone is not enough).
- **WebSockets:** Agent connections require an authenticated session. The worker sets `x-user-id` from the logged-in user’s email before the connection is accepted. Unauthenticated connects receive `401`.
- **Password policy:** Minimum 8 characters with uppercase, lowercase, number, and special character; confirm must match. Enforced server-side via `validatePassword` in `packages/utils/password.ts` on change-password, reset-password, and invite. Users flagged `mustChangePassword` are redirected until they change password.

## Session permissions

Access is computed per user and session in `roadmaps-agents/src/shared/access.ts`. A user may qualify through ownership, team membership, or explicit share.

| Tier       | Who                                             | Typical operations                                                                              |
| ---------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Owner**  | Session creator                                 | Delete, rename, share/unshare, move location, dot-voting settings                               |
| **Editor** | Owner, team admin, or share with `write`        | Items CRUD, timeline settings, voting properties, Linear import, roadmap status, AI description |
| **Voter**  | Anyone with session access who is not an editor | Cast/remove votes                                                                               |
| **Reader** | Owner, team member, or share with `read`        | View session, connect WebSocket, read data                                                      |

Helpers: `canAccessSession`, `canEditSession`, `canVote`, `canManageSharing` (owner only).

Team admins receive editor-level session access when the session belongs to their team.

## Enforcement layers

### HTTP (loaders & actions)

- **Session pages:** Loaders call `userHasAccess` on the session agent; no access → `403`.
- **Session actions:** `requireSessionAccessTier` maps intent to `read` / `edit` / `owner` before work runs. Checks run inside the session Durable Object via `checkAccess` (not by re-implementing rules in the app layer).
- **Settings routes:** Dot-voting settings require owner; property-voting settings require editor.
- **Move session:** Owner only; target team membership verified for `move-to-team`.

### WebSocket (real-time)

- **Connect:** Session agent rejects users without access (`1008 Forbidden`).
- **Identity:** Acting user is always `channel.userId` from the connection. Client payloads must not include `email`, `username`, or `createdBy`; channel handlers inject `userId` via `withActingUser`.
- **Mutations:** Agent handlers call `buildAccessContext` and the appropriate `can*` helper before changing state.
- **Revocation:** Removing a share disconnects that user’s WebSocket connections and redirects share-only clients to home.

### Teams

- **View team:** Team member required (`requireTeamMember`).
- **Invite / remove member:** Team admin required (`requireTeamAdmin`).
- **Create session in team context:** Team membership verified before session is created and indexed.

### App user roles

Roadmaps has two **app-level** roles only. These are stored on the user record in the system agent and checked on platform routes (e.g. User Administration). They are separate from session permissions and team membership.

| Role            | Who gets it                                                                                                | Access                                              |
| --------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **`user`**      | Default for every account created via invite or team invite                                                | Normal app use: drafts, teams, sessions, sharing    |
| **`app_admin`** | Bootstrap admin on first deploy (`BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD`) when no users exist | User Administration and other platform admin routes |

**Invites from User Administration** create an email-only invite. When the invite is accepted, the new account is always created with role `user`. There is no UI to assign or promote `app_admin` after bootstrap.

**Team roles** (`admin`, `member`) are a different layer: they govern membership and management within a single team (invite/remove members, team-scoped sessions). They do not change the user’s app-level role.

- `app_admin` gates platform routes via `requireAdmin` (e.g. `/admin/users`). Separate from session and team permissions.

## Data boundaries

- **Durable Objects:** Session, user, team, and system state live in SQLite-backed DOs. Authorization runs in the agent that owns the data.
- **Secrets:** API keys (Linear, AI, email) are server-side env vars only; not exposed to the client.
- **Email:** Outbound share/invite HTML is escaped; subjects are sanitized.
- **AI:** Description generation uses server-stored item content only; client cannot supply arbitrary external content.

## Reporting issues

If you discover a security vulnerability, please report it privately to the maintainers rather than opening a public issue. Include steps to reproduce and expected vs. actual behavior.
