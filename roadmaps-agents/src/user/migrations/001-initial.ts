export const migration = `
  CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS personal_sessions (
    uuid TEXT PRIMARY KEY,
    session_type TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS shared_sessions (
    uuid TEXT PRIMARY KEY,
    session_type TEXT NOT NULL,
    name TEXT NOT NULL,
    owner_email TEXT NOT NULL,
    permission TEXT NOT NULL,
    shared_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS team_ids (
    team_id TEXT PRIMARY KEY,
    joined_at INTEGER NOT NULL
  );

  INSERT OR IGNORE INTO schema_version (version, updated_at) VALUES (1, UNIXEPOCH());
`
