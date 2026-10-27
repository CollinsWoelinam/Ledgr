import { dedupeKey } from '@ledgr/parser';
import type { Transaction } from '../schema';
import type { SqlDb, SqlValue } from '../sql';

interface Row {
  id: string;
  provider: string;
  external_ref: string | null;
  reverses_ref: string | null;
  type: Transaction['type'];
  direction: Transaction['direction'];
  amount_minor: number;
  fee_minor: number;
  tax_minor: number;
  currency: string;
  counterparty_name: string | null;
  counterparty_number: string | null;
  balance_after_minor: number | null;
  occurred_at: number;
  category_id: string;
  source: Transaction['source'];
  sms_body: string | null;
  business: number;
}

const COLUMNS =
  'id, provider, external_ref, reverses_ref, type, direction, amount_minor, fee_minor, tax_minor, currency, counterparty_name, ' +
  'counterparty_number, balance_after_minor, occurred_at, category_id, source, sms_body, dedupe_key, created_at, updated_at, business';

const fromRow = (r: Row): Transaction => ({
  id: r.id,
  provider: r.provider,
  externalRef: r.external_ref ?? undefined,
  reversesRef: r.reverses_ref ?? undefined,
  type: r.type,
  direction: r.direction,
  amountMinor: r.amount_minor,
  feeMinor: r.fee_minor,
  taxMinor: r.tax_minor,
  currency: r.currency,
  counterpartyName: r.counterparty_name ?? undefined,
  counterpartyNumber: r.counterparty_number ?? undefined,
  balanceAfterMinor: r.balance_after_minor ?? undefined,
  occurredAt: r.occurred_at,
  categoryId: r.category_id,
  source: r.source,
  smsBody: r.sms_body ?? undefined,
  ...(r.business ? { business: true as const } : {}),
});

const toParams = (t: Transaction, now: number): SqlValue[] => [
  t.id, t.provider, t.externalRef ?? null, t.reversesRef ?? null, t.type, t.direction, t.amountMinor, t.feeMinor, t.taxMinor,
  t.currency, t.counterpartyName ?? null, t.counterpartyNumber ?? null, t.balanceAfterMinor ?? null, t.occurredAt, t.categoryId,
  t.source, t.smsBody ?? null, dedupeKey({ ...t, templateVersion: 0 }), now, now, t.business ? 1 : 0,
];

// Newest first, as every screen shows them.
export async function listTransactions(db: SqlDb): Promise<Transaction[]> {
  return (await db.all<Row>(`SELECT ${COLUMNS} FROM transactions ORDER BY occurred_at DESC`)).map(fromRow);
}

// FR-2.3: a transaction already stored under the same dedupe key is skipped. Returns how many were new.
export async function insertTransactions(db: SqlDb, transactions: Transaction[]): Promise<number> {
  const before = await countTransactions(db);
  const now = Date.now();
  await db.transaction(async () => {
    for (const t of transactions) {
      await db.run(`INSERT OR IGNORE INTO transactions (${COLUMNS}) VALUES (${COLUMNS.split(',').map(() => '?').join(', ')})`, toParams(t, now));
    }
  });
  return (await countTransactions(db)) - before;
}

// Rewrites one transaction in place (an edited manual entry), recomputing its dedupe key.
export async function replaceTransaction(db: SqlDb, t: Transaction): Promise<void> {
  await db.transaction(async () => {
    await db.run('DELETE FROM transactions WHERE id = ?', [t.id]);
    await db.run(`INSERT INTO transactions (${COLUMNS}) VALUES (${COLUMNS.split(',').map(() => '?').join(', ')})`, toParams(t, Date.now()));
  });
}

export async function deleteTransactions(db: SqlDb, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await db.run(`DELETE FROM transactions WHERE id IN (${ids.map(() => '?').join(', ')})`, ids);
}

export async function setTransactionCategory(db: SqlDb, ids: string[], categoryId: string): Promise<void> {
  if (ids.length === 0) return;
  await db.run(`UPDATE transactions SET category_id = ?, updated_at = ? WHERE id IN (${ids.map(() => '?').join(', ')})`, [categoryId, Date.now(), ...ids]);
}

export async function setBusiness(db: SqlDb, ids: string[], business: boolean): Promise<void> {
  if (ids.length === 0) return;
  await db.run(`UPDATE transactions SET business = ?, updated_at = ? WHERE id IN (${ids.map(() => '?').join(', ')})`, [business ? 1 : 0, Date.now(), ...ids]);
}

export async function listBusinessCounterparties(db: SqlDb): Promise<string[]> {
  return (await db.all<{ counterparty_key: string }>('SELECT counterparty_key FROM business_counterparties')).map((r) => r.counterparty_key);
}

export async function setBusinessCounterparty(db: SqlDb, key: string, business: boolean): Promise<void> {
  if (business) await db.run('INSERT OR IGNORE INTO business_counterparties (counterparty_key) VALUES (?)', [key]);
  else await db.run('DELETE FROM business_counterparties WHERE counterparty_key = ?', [key]);
}

export async function moveCategory(db: SqlDb, from: string, to: string): Promise<void> {
  await db.run('UPDATE transactions SET category_id = ?, updated_at = ? WHERE category_id = ?', [to, Date.now(), from]);
}

export async function countTransactions(db: SqlDb): Promise<number> {
  return (await db.get<{ n: number }>('SELECT COUNT(*) AS n FROM transactions'))?.n ?? 0;
}
