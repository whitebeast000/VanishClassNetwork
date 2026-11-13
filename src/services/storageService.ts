import { getDb, query, run } from '../database/database';
import { Message, MessageDeliverPayload } from '../types/protocol';
import { uuidv4 } from '../utils/uuid';

export interface StoredMessage extends Message {
  created_at: number; // local, only used for ordering
}
export interface QueueRow {
  id: string;
  text: string;
  created_at: number;
  queue_expires_at: number;
  retry_count: number;
}

// ---------- settings ----------
export async function getSetting(key: string): Promise<string | null> {
  const rows = await query<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  return rows[0]?.value ?? null;
}
export async function setSetting(key: string, value: string): Promise<void> {
  await run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
}
export async function deleteSetting(key: string): Promise<void> {
  await run('DELETE FROM settings WHERE key = ?', [key]);
}
export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await getSetting('device_id');
  if (existing) return existing;
  const id = uuidv4();
  await setSetting('device_id', id);
  return id;
}

// ---------- reading ----------
// Expired rows are never returned, even in the instant before cleanup deletes them.
export async function loadActive(now: number): Promise<StoredMessage[]> {
  return query<StoredMessage>(
    `SELECT * FROM messages
     WHERE expires_at IS NULL OR expires_at > ?
     ORDER BY COALESCE(sent_at, created_at) ASC, created_at ASC`,
    [now],
  );
}
export async function counts(): Promise<{ messages: number; queue: number }> {
  const m = await query<{ n: number }>('SELECT COUNT(*) AS n FROM messages');
  const q = await query<{ n: number }>('SELECT COUNT(*) AS n FROM outgoing_queue');
  return { messages: Number(m[0]?.n ?? 0), queue: Number(q[0]?.n ?? 0) };
}

// ---------- outgoing ----------
// Message row + queue row are written together (one transaction).
export async function insertOutgoing(m: {
  id: string; sender: string; device_id: string; text: string;
  created_at: number; queue_expires_at: number;
}): Promise<void> {
  const db = await getDb();
  await db.transaction(async tx => {
    await tx.execute(
      `INSERT INTO messages (id, sender, device_id, text, sent_at, expires_at, status, created_at)
       VALUES (?, ?, ?, ?, NULL, NULL, 'CREATED', ?)`,
      [m.id, m.sender, m.device_id, m.text, m.created_at],
    );
    await tx.execute(
      `INSERT INTO outgoing_queue (id, text, created_at, queue_expires_at, retry_count)
       VALUES (?, ?, ?, ?, 0)`,
      [m.id, m.text, m.created_at, m.queue_expires_at],
    );
  });
}
export async function getQueue(): Promise<QueueRow[]> {
  return query<QueueRow>('SELECT * FROM outgoing_queue ORDER BY created_at ASC');
}
export async function touchQueue(id: string, now: number): Promise<void> {
  await run(
    'UPDATE outgoing_queue SET retry_count = retry_count + 1, last_attempt_at = ? WHERE id = ?',
    [now, id],
  );
}
// Only moves forward through CREATED / WAITING / SENT; never overwrites DELIVERED.
export async function markOutgoing(id: string, status: 'CREATED' | 'WAITING' | 'SENT'): Promise<void> {
  await run(
    "UPDATE messages SET status = ? WHERE id = ? AND status IN ('CREATED','WAITING','SENT')",
    [status, id],
  );
}
export async function applyDelivered(id: string, sentAt: number, expiresAt: number): Promise<void> {
  const db = await getDb();
  await db.transaction(async tx => {
    await tx.execute(
      "UPDATE messages SET status = 'DELIVERED', sent_at = ?, expires_at = ? WHERE id = ?",
      [sentAt, expiresAt, id],
    );
    await tx.execute('DELETE FROM outgoing_queue WHERE id = ?', [id]);
  });
}
// DROPPED: queue row is deleted at once. The message row stays a few seconds
// (so the user sees "Not delivered") and is then removed by normal cleanup.
export async function applyDropped(id: string, removeAt: number): Promise<void> {
  const db = await getDb();
  await db.transaction(async tx => {
    await tx.execute(
      "UPDATE messages SET status = 'DROPPED', expires_at = ? WHERE id = ?",
      [removeAt, id],
    );
    await tx.execute('DELETE FROM outgoing_queue WHERE id = ?', [id]);
  });
}

// ---------- incoming ----------
// Returns true only if the message is NEW. The ID goes into processed_messages
// first; if it was already there, nothing else happens (duplicate prevention).
export async function insertIncoming(p: MessageDeliverPayload, now: number): Promise<boolean> {
  const db = await getDb();
  let inserted = false;
  await db.transaction(async tx => {
    const r = await tx.execute(
      'INSERT OR IGNORE INTO processed_messages (id, seen_at) VALUES (?, ?)',
      [p.id, now],
    );
    if ((r.rowsAffected ?? 0) === 0) return;
    await tx.execute(
      `INSERT OR IGNORE INTO messages (id, sender, device_id, text, sent_at, expires_at, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'DELIVERED', ?)`,
      [p.id, p.sender, p.device_id, p.text, p.sent_at, p.expires_at, now],
    );
    inserted = true;
  });
  return inserted;
}
export async function markDisplayed(id: string): Promise<void> {
  await run("UPDATE messages SET status = 'DISPLAYED' WHERE id = ? AND status = 'DELIVERED'", [id]);
}

// ---------- deletion ----------
export async function deleteMessage(id: string): Promise<void> {
  await run('DELETE FROM messages WHERE id = ?', [id]);
  await run('DELETE FROM outgoing_queue WHERE id = ?', [id]);
}
// PHYSICAL deletion of expired rows. Returns how many rows were removed.
export async function purgeExpiredMessages(now: number): Promise<number> {
  return run('DELETE FROM messages WHERE expires_at IS NOT NULL AND expires_at <= ?', [now]);
}
// Queued messages older than the max queue age become DROPPED.
export async function expireQueue(localNow: number, removeAt: number): Promise<number> {
  const due = await query<{ id: string }>(
    'SELECT id FROM outgoing_queue WHERE queue_expires_at <= ?',
    [localNow],
  );
  for (const r of due) await applyDropped(r.id, removeAt);
  return due.length;
}
export async function purgeProcessed(olderThan: number): Promise<void> {
  await run('DELETE FROM processed_messages WHERE seen_at < ?', [olderThan]);
}
export async function clearAll(): Promise<void> {
  await run('DELETE FROM messages');
  await run('DELETE FROM outgoing_queue');
  await run('DELETE FROM processed_messages');
}