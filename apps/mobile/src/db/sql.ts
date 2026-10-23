export type SqlValue = string | number | null;

// The slice of a SQLite connection the repositories need. expo-sqlite backs it on the phone,
// node:sqlite in tests, so the data layer is tested against real SQL.
export interface SqlDb {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlValue[]): Promise<void>;
  all<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  get<T>(sql: string, params?: SqlValue[]): Promise<T | null>;
  transaction(task: () => Promise<void>): Promise<void>;
}
