export const migration = `
  CREATE TABLE IF NOT EXISTS shared_schema_version (
    version INTEGER PRIMARY KEY,
    updated_at INTEGER NOT NULL
  );
  INSERT OR IGNORE INTO shared_schema_version (version, updated_at) VALUES (1, UNIXEPOCH());
`
