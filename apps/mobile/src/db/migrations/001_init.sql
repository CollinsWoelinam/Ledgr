CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('expense', 'income')),
  is_default INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  external_ref TEXT,
  type TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  amount_minor INTEGER NOT NULL,
  fee_minor INTEGER NOT NULL DEFAULT 0,
  tax_minor INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL,
  counterparty_name TEXT,
  counterparty_number TEXT,
  balance_after_minor INTEGER,
  occurred_at INTEGER NOT NULL,
  category_id TEXT REFERENCES categories(id),
  source TEXT NOT NULL CHECK (source IN ('sms', 'manual')),
  linked_reversal_id TEXT REFERENCES transactions(id),
  dedupe_key TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_transactions_occurred_at ON transactions(occurred_at);
CREATE INDEX idx_transactions_category ON transactions(category_id);

CREATE TABLE category_rules (
  id TEXT PRIMARY KEY,
  match_type TEXT NOT NULL CHECK (match_type IN ('counterparty', 'keyword', 'type')),
  pattern TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES categories(id),
  priority INTEGER NOT NULL,
  created_by TEXT NOT NULL CHECK (created_by IN ('user', 'system'))
);

CREATE TABLE budgets (
  id TEXT PRIMARY KEY,
  category_id TEXT REFERENCES categories(id), -- NULL = overall
  amount_minor INTEGER NOT NULL,
  period_start_day INTEGER NOT NULL DEFAULT 1
);

-- Raw body is kept only until the user resolves the item.
CREATE TABLE review_queue (
  id TEXT PRIMARY KEY,
  sender TEXT NOT NULL,
  body TEXT,
  body_hash TEXT NOT NULL UNIQUE,
  received_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE parser_templates (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  version INTEGER NOT NULL,
  type TEXT NOT NULL,
  pattern TEXT NOT NULL,
  field_map TEXT
);

CREATE TABLE sync_state (
  table_name TEXT PRIMARY KEY,
  last_synced_at INTEGER,
  pending_changes INTEGER NOT NULL DEFAULT 0
);
