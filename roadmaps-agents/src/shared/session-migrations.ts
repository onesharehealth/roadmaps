export const itemsMigration = `
  CREATE TABLE IF NOT EXISTS roadmap_items (
    uuid TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    roadmap_status TEXT NOT NULL DEFAULT 'unaddressed',
    roadmap_order INTEGER,
    duration_weeks INTEGER,
    external_id TEXT,
    estimate REAL,
    external_content TEXT,
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS item_labels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_uuid TEXT NOT NULL,
    text TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
`

export const dotVotesMigration = `
  CREATE TABLE IF NOT EXISTS dot_votes (
    item_uuid TEXT NOT NULL,
    username TEXT NOT NULL,
    x REAL NOT NULL,
    y REAL NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (item_uuid, username)
  );
`

export const dotVotesMigrationV2 = `
  DROP TABLE IF EXISTS dot_votes;

  CREATE TABLE dot_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_uuid TEXT NOT NULL,
    username TEXT NOT NULL,
    dot_position_x REAL NOT NULL,
    dot_position_y REAL NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (UNIXEPOCH()),
    updated_at INTEGER NOT NULL DEFAULT (UNIXEPOCH()),
    UNIQUE(item_uuid, username, dot_position_x, dot_position_y)
  );

  CREATE INDEX IF NOT EXISTS idx_dot_votes_item_uuid ON dot_votes(item_uuid);
  CREATE INDEX IF NOT EXISTS idx_dot_votes_username ON dot_votes(username);
  CREATE INDEX IF NOT EXISTS idx_dot_votes_composite ON dot_votes(item_uuid, username);
`

export const propertyVotingMigration = `
  CREATE TABLE IF NOT EXISTS voting_properties (
    uuid TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS property_votes (
    property_uuid TEXT NOT NULL,
    item_uuid TEXT NOT NULL,
    username TEXT NOT NULL,
    value REAL NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (property_uuid, item_uuid, username)
  );
`
