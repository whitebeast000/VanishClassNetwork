interface Executor {
  execute: (sql: string, params?: any[]) => Promise<any>;
}

// Version 1 schema. PRAGMA user_version remembers which version is installed.
export async function migrate(db: Executor): Promise<void> {
  const r = await db.execute('PRAGMA user_version');
  const version = Number(r.rows?.[0]?.user_version ?? 0);
  if (version >= 1) return;

  const statements = [
    `CREATE TABLE IF NOT EXISTS messages (
       id TEXT PRIMARY KEY,
       sender TEXT NOT NULL,
       device_id TEXT NOT NULL,
       text TEXT NOT NULL,
       sent_at INTEGER,
       expires_at INTEGER,
       status TEXT NOT NULL,
       created_at INTEGER NOT NULL
     )`,
    'CREATE INDEX IF NOT EXISTS idx_messages_expires ON messages(expires_at)',
    `CREATE TABLE IF NOT EXISTS outgoing_queue (
       id TEXT PRIMARY KEY,
       text TEXT NOT NULL,
       created_at INTEGER NOT NULL,
       queue_expires_at INTEGER NOT NULL,
       retry_count INTEGER NOT NULL DEFAULT 0,
       last_attempt_at INTEGER
     )`,
    `CREATE TABLE IF NOT EXISTS processed_messages (
       id TEXT PRIMARY KEY,
       seen_at INTEGER NOT NULL
     )`,
    `CREATE TABLE IF NOT EXISTS settings (
       key TEXT PRIMARY KEY,
       value TEXT NOT NULL
     )`,
  ];
  for (const s of statements) await db.execute(s);
  await db.execute('PRAGMA user_version = 1');
}