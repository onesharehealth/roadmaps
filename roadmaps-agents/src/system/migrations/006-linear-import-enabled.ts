export const migration = `
  ALTER TABLE users ADD COLUMN linear_import_enabled INTEGER NOT NULL DEFAULT 0;

  UPDATE schema_version SET version = 6, updated_at = UNIXEPOCH() WHERE version = 5;
  INSERT OR IGNORE INTO schema_version (version, updated_at) VALUES (6, UNIXEPOCH());
`
