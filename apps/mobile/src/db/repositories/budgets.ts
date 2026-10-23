import type { Budget } from '../schema';
import type { SqlDb } from '../sql';

const OVERALL = 'overall';

export async function listBudgets(db: SqlDb): Promise<Budget[]> {
  const rows = await db.all<{ category_id: string | null; amount_minor: number }>('SELECT category_id, amount_minor FROM budgets');
  return rows.map((r) => ({ categoryId: r.category_id, amountMinor: r.amount_minor }));
}

// null or a non-positive amount removes the budget.
export async function setBudget(db: SqlDb, categoryId: string | null, amountMinor: number | null): Promise<void> {
  const id = categoryId ?? OVERALL;
  if (!amountMinor || amountMinor <= 0) {
    await db.run('DELETE FROM budgets WHERE id = ?', [id]);
    return;
  }
  await db.run('INSERT INTO budgets (id, category_id, amount_minor) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET amount_minor = excluded.amount_minor', [
    id,
    categoryId,
    amountMinor,
  ]);
}
