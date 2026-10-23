import type { SqlDb } from './sql';

// Append-only: each entry upgrades the schema by one version (tracked in PRAGMA user_version).
// All money columns are integer minor units.
export const MIGRATIONS: string[] = [
  `
  CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('expense', 'income')),
    is_default INTEGER NOT NULL DEFAULT 0,
    sort INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    external_ref TEXT,
    reverses_ref TEXT,
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
    category_id TEXT NOT NULL REFERENCES categories(id),
    source TEXT NOT NULL CHECK (source IN ('sms', 'manual', 'demo')),
    sms_body TEXT,
    dedupe_key TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX idx_transactions_occurred_at ON transactions(occurred_at DESC);
  CREATE INDEX idx_transactions_category ON transactions(category_id);

  CREATE TABLE category_rules (
    id TEXT PRIMARY KEY,
    match_type TEXT NOT NULL CHECK (match_type IN ('counterparty', 'keyword', 'type')),
    pattern TEXT NOT NULL,
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    priority INTEGER NOT NULL,
    created_by TEXT NOT NULL CHECK (created_by IN ('user', 'system'))
  );

  -- id is the category id, or 'overall' for the whole-month budget.
  CREATE TABLE budgets (
    id TEXT PRIMARY KEY,
    category_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
    amount_minor INTEGER NOT NULL CHECK (amount_minor > 0)
  );

  -- Raw body is kept only until the user resolves the item (FR-2.5).
  CREATE TABLE review_queue (
    id TEXT PRIMARY KEY,
    sender TEXT NOT NULL,
    body TEXT NOT NULL,
    received_at INTEGER NOT NULL
  );

  CREATE TABLE parser_templates (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    version INTEGER NOT NULL,
    type TEXT NOT NULL,
    pattern TEXT NOT NULL,
    date_format TEXT
  );

  CREATE TABLE sync_state (
    table_name TEXT PRIMARY KEY,
    last_synced_at INTEGER,
    pending_changes INTEGER NOT NULL DEFAULT 0
  );
  `,
];

export async function migrate(db: SqlDb): Promise<number> {
  const row = await db.get<{ user_version: number }>('PRAGMA user_version');
  const from = row?.user_version ?? 0;
  for (let v = from; v < MIGRATIONS.length; v++) {
    await db.transaction(async () => {
      await db.exec(MIGRATIONS[v]!);
      await db.exec(`PRAGMA user_version = ${v + 1}`);
    });
  }
  return MIGRATIONS.length;
}
