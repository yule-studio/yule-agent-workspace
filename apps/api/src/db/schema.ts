/**
 * SQLite schema. The workspace DB is the operational source of truth — Discord,
 * GitHub, and the engine all map onto these tables; none of them is the SoT.
 *
 * Invariants enforced at the DB level:
 *  - `tasks.work_item_key` is unique when set  -> one canonical task per work item.
 *  - one active session per task               -> partial unique index on
 *    sessions(task_id) WHERE closed_at IS NULL (terminal sessions set closed_at).
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS tasks (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  source          TEXT NOT NULL,
  work_item_key   TEXT,
  role            TEXT NOT NULL,
  priority        TEXT NOT NULL DEFAULT 'normal',
  active_session_id TEXT,
  github_repo     TEXT,
  github_issue    INTEGER,
  github_pr       INTEGER,
  github_branch   TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_work_item
  ON tasks(work_item_key) WHERE work_item_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS sessions (
  id                      TEXT PRIMARY KEY,
  task_id                 TEXT NOT NULL REFERENCES tasks(id),
  role                    TEXT NOT NULL,
  state                   TEXT NOT NULL,
  prior_state             TEXT,
  runtime_mode            TEXT NOT NULL,
  approval_json           TEXT,
  budget_cap              INTEGER NOT NULL,
  budget_used             INTEGER NOT NULL DEFAULT 0,
  budget_escalation_ratio REAL NOT NULL DEFAULT 0.8,
  budget_escalated        INTEGER NOT NULL DEFAULT 0,
  fp_diff                 TEXT,
  fp_issue                TEXT,
  snapshot_json           TEXT,
  created_at              TEXT NOT NULL,
  updated_at              TEXT NOT NULL,
  closed_at               TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_session_per_task
  ON sessions(task_id) WHERE closed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_task ON sessions(task_id);

CREATE TABLE IF NOT EXISTS transitions (
  id           TEXT PRIMARY KEY,
  session_id   TEXT NOT NULL REFERENCES sessions(id),
  event        TEXT NOT NULL,
  from_state   TEXT NOT NULL,
  to_state     TEXT NOT NULL,
  actor        TEXT NOT NULL,
  reason       TEXT,
  tokens_spent INTEGER NOT NULL DEFAULT 0,
  at           TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transitions_session ON transitions(session_id);

CREATE TABLE IF NOT EXISTS token_usage (
  day    TEXT NOT NULL,
  role   TEXT NOT NULL,
  tokens INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, role)
);

CREATE TABLE IF NOT EXISTS events (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL,
  at          TEXT NOT NULL,
  dedupe_key  TEXT,
  payload_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_at ON events(at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_dedupe
  ON events(dedupe_key) WHERE dedupe_key IS NOT NULL;
`;
