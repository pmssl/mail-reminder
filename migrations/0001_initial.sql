CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  repeat_type TEXT NOT NULL CHECK (repeat_type IN ('once', 'days', 'weekly', 'monthly', 'yearly')),
  repeat_value INTEGER NOT NULL DEFAULT 1 CHECK (repeat_value >= 1),
  start_date TEXT NOT NULL,
  next_run TEXT,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders (enabled, next_run);
CREATE INDEX IF NOT EXISTS idx_reminders_email ON reminders (email);
CREATE INDEX IF NOT EXISTS idx_reminders_updated_at ON reminders (updated_at);
