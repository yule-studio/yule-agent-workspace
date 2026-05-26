/**
 * SQLite connection via Node's built-in `node:sqlite` — zero native build, zero
 * external service. The whole DB layer is hidden behind repositories so a
 * Postgres driver can replace this file later without touching callers.
 */
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { SCHEMA_SQL } from './schema.js';

export type Db = DatabaseSync;

export function openDb(dbPath: string): Db {
  if (dbPath !== ':memory:') {
    mkdirSync(dirname(dbPath), { recursive: true });
  }
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA_SQL);
  return db;
}
