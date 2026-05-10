CREATE TABLE IF NOT EXISTS expenses (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  amount     REAL NOT NULL,
  category   TEXT,
  note       TEXT,
  date       TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);
