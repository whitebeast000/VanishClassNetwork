import { MAX_QUEUE_AGE_MS, DeliveryAckPayload, MessageDeliverPayload, MessageExpiredPayload } from '../types/protocol';
import { serverNow } from '../utils/time';
import { uuidv4 } from '../utils/uuid';
import { socketService } from './socketService';
import * as store from './storageService';

const DROPPED_VISIBLE_MS = 5000;

// IDs sent on THIS connection that are waiting for an ack.
const inFlight = new Set<string>();
export function resetInFlight(): void { inFlight.clear(); }

// CREATED: the UUID is made ONCE, here. Retries reuse it.
export async function createOutgoing(name: string, deviceId: string, text: string): Promise<string> {
  const id = uuidv4();
  const now = Date.now();
  await store.insertOutgoing({
    id, sender: name, device_id: deviceId, text,
    created_at: now, queue_expires_at: now + MAX_QUEUE_AGE_MS,
  });
  return id;
}

// Sends every eligible queued message. Runs one at a time (chained).
let chain: Promise<void> = Promise.resolve();
export function flushQueue(name: string, deviceId: string): Promise<void> {
  chain = chain.then(() => doFlush(name, deviceId)).catch(() => undefined);
  return chain;
}

async function doFlush(name: string, deviceId: string): Promise<void> {
  const rows = await store.getQueue();
  const now = Date.now();
  for (const row of rows) {
    if (row.queue_expires_at <= now) continue; // too old: cleanup will DROP it
    if (inFlight.has(row.id)) continue;        // already sent, waiting for the ack
    if (!socketService.isReady()) {
      await store.markOutgoing(row.id, 'WAITING');
      continue;
    }
    const ok = socketService.send('MESSAGE_SEND', {
      id: row.id, sender: name, device_id: deviceId, text: row.text,
      queued_ms: Math.max(0, now - row.created_at), // relay checks this too
    });
    if (ok) {
      inFlight.add(row.id);
      await store.markOutgoing(row.id, 'SENT');
      await store.touchQueue(row.id, now);
    } else {
      await store.markOutgoing(row.id, 'WAITING');
    }
  }
}

export async function handleAck(p: DeliveryAckPayload): Promise<void> {
  inFlight.delete(p.message_id);
  if (p.status === 'DELIVERED' && p.sent_at !== null && p.expires_at !== null) {
    await store.applyDelivered(p.message_id, p.sent_at, p.expires_at);
  } else {
    await store.applyDropped(p.message_id, serverNow() + DROPPED_VISIBLE_MS);
  }
}

// Returns true if a NEW message was stored.
export async function handleDeliver(p: MessageDeliverPayload, myDeviceId: string): Promise<boolean> {
  if (p.device_id === myDeviceId) return false;
  if (p.expires_at <= serverNow()) return false; // already expired: never stored
  const inserted = await store.insertIncoming(p, serverNow());
  if (inserted) await store.markDisplayed(p.id); // DELIVERED -> DISPLAYED
  return inserted;
}

// The relay announced expiry: delete now.
export async function handleExpired(p: MessageExpiredPayload): Promise<void> {
  await store.deleteMessage(p.message_id);
}