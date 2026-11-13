import { open } from '@op-engineering/op-sqlite';
import { migrate } from './migrations';

export type DB = ReturnType<typeof open>;

let dbPromise: Promise<DB> | null = null;

// Opens the database once and creates the tables on first use.
export function getDb(): Promise<DB> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = open({ name: 'vanish.db' });
      await migrate(db);
      return db;
    })();
  }
  return dbPromise;
}

export async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const db = await getDb();
  const res = await db.execute(sql, params as any[]);
  return (res.rows ?? []) as unknown as T[];
}

export async function run(sql: string, params: unknown[] = []): Promise<number> {
  const db = await getDb();
  const res = await db.execute(sql, params as any[]);
  return res.rowsAffected ?? 0;
}