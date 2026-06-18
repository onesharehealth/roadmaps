export const migration = `
  CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS team_meta (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS team_members (
    email TEXT PRIMARY KEY,
    role TEXT NOT NULL,
    joined_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS team_sessions (
    uuid TEXT PRIMARY KEY,
    session_type TEXT NOT NULL,
    name TEXT NOT NULL,
    owner_email TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  INSERT OR IGNORE INTO schema_version (version, updated_at) VALUES (1, UNIXEPOCH());
`
