import type { SqlDb } from '../sql';

export async function listDismissedGaps(db: SqlDb): Promise<string[]> {
  return (await db.all<{ key: string }>('SELECT key FROM dismissed_gaps')).map((r) => r.key);
}

export async function dismissGap(db: SqlDb, key: string): Promise<void> {
  await db.run('INSERT OR IGNORE INTO dismissed_gaps (key, dismissed_at) VALUES (?, ?)', [key, Date.now()]);
}
