import { DatabaseSync } from 'node:sqlite';
import { migrate } from '../migrations';
import type { SqlDb, SqlValue } from '../sql';

// In-memory SQLite for tests, behind the same SqlDb interface the app uses.
export async function openTestDb(version?: number): Promise<SqlDb> {
  const native = new DatabaseSync(':memory:');
  native.exec('PRAGMA foreign_keys = ON');
  let inTransaction = false;
  const db: SqlDb = {
    exec: async (sql) => void native.exec(sql),
    run: async (sql, params: SqlValue[] = []) => void native.prepare(sql).run(...params),
    all: async <T,>(sql: string, params: SqlValue[] = []) => native.prepare(sql).all(...params) as T[],
    get: async <T,>(sql: string, params: SqlValue[] = []) => (native.prepare(sql).get(...params) as T | undefined) ?? null,
    transaction: async (task) => {
      // expo-sqlite fails on a nested BEGIN, so tests must too.
      if (inTransaction) throw new Error('Nested transaction');
      inTransaction = true;
      native.exec('BEGIN');
      try {
        await task();
        native.exec('COMMIT');
      } catch (e) {
        native.exec('ROLLBACK');
        throw e;
      } finally {
        inTransaction = false;
      }
    },
  };
  await migrate(db, version);
  return db;
}
