import { getRandomBytes } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { migrate } from './migrations';
import type { SqlDb } from './sql';

const DB_NAME = 'ledgr.db';
const KEY_NAME = 'ledgr.db.key';

export interface OpenedDb {
  db: SqlDb;
  // True only when SQLCipher is compiled in (dev or release build). Expo Go has plain SQLite.
  encrypted: boolean;
}

// The database key is random, generated on first launch and kept in Android Keystore via SecureStore.
async function databaseKey(): Promise<string> {
  const existing = await SecureStore.getItemAsync(KEY_NAME);
  if (existing) return existing;
  const key = Array.from(getRandomBytes(32), (b) => b.toString(16).padStart(2, '0')).join('');
  await SecureStore.setItemAsync(KEY_NAME, key, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  return key;
}

export async function openLedgerDb(): Promise<OpenedDb> {
  const native = await openDatabaseAsync(DB_NAME);
  const key = await databaseKey();
  // Must be the first statement on the connection. Ignored by plain SQLite.
  await native.execAsync(`PRAGMA key = "x'${key}'"`);
  const cipher = await native.getFirstAsync<{ cipher_version: string }>('PRAGMA cipher_version').catch(() => null);
  await native.execAsync('PRAGMA foreign_keys = ON; PRAGMA secure_delete = ON; PRAGMA journal_mode = WAL;');

  const db = wrap(native);
  await migrate(db);
  return { db, encrypted: !!cipher?.cipher_version };
}

function wrap(native: SQLiteDatabase): SqlDb {
  return {
    exec: (sql) => native.execAsync(sql),
    run: async (sql, params = []) => {
      await native.runAsync(sql, params);
    },
    all: (sql, params = []) => native.getAllAsync(sql, params),
    get: (sql, params = []) => native.getFirstAsync(sql, params),
    transaction: (task) => native.withTransactionAsync(task),
  };
}
