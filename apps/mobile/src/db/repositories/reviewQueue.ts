import type { ReviewItem } from '../schema';
import type { SqlDb } from '../sql';

export async function listReviewItems(db: SqlDb): Promise<ReviewItem[]> {
  const rows = await db.all<{ id: string; sender: string; body: string; received_at: number }>('SELECT id, sender, body, received_at FROM review_queue ORDER BY received_at DESC');
  return rows.map((r) => ({ id: r.id, sender: r.sender, body: r.body, receivedAt: r.received_at }));
}

export async function addReviewItems(db: SqlDb, items: ReviewItem[]): Promise<void> {
  await db.transaction(async () => {
    for (const i of items) await db.run('INSERT OR IGNORE INTO review_queue (id, sender, body, received_at) VALUES (?, ?, ?, ?)', [i.id, i.sender, i.body, i.receivedAt]);
  });
}

// Resolving deletes the raw SMS text.
export async function removeReviewItem(db: SqlDb, id: string): Promise<void> {
  await db.run('DELETE FROM review_queue WHERE id = ?', [id]);
}
