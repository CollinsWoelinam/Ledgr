import type { StoredEvidence } from '../schema';
import type { SqlDb } from '../sql';

interface Row {
  id: string;
  provider: string;
  kind: StoredEvidence['kind'];
  amount_minor: number | null;
  at: number;
}

export async function listEvidence(db: SqlDb): Promise<StoredEvidence[]> {
  const rows = await db.all<Row>('SELECT id, provider, kind, amount_minor, at FROM evidence ORDER BY at');
  return rows.map((r) => ({ id: r.id, provider: r.provider, kind: r.kind, amountMinor: r.amount_minor ?? undefined, at: r.at }));
}

export async function addEvidence(db: SqlDb, items: StoredEvidence[]): Promise<void> {
  await db.transaction(async () => {
    for (const e of items) {
      await db.run('INSERT OR IGNORE INTO evidence (id, provider, kind, amount_minor, at) VALUES (?, ?, ?, ?, ?)', [
        e.id, e.provider, e.kind, e.amountMinor ?? null, e.at,
      ]);
    }
  });
}
