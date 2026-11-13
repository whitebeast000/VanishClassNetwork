import {
  DeliveryAckPayload, MESSAGE_LIFETIME_MS, MessageDeliverPayload,
} from '../types/protocol';

// How long an ID is remembered AFTER expiry, so a late duplicate is still ignored.
const DEDUPE_GRACE_MS = 120_000;

interface StoredMessage {
  ack: DeliveryAckPayload;      // what we answered the sender (re-sent for duplicates)
  expiresAt: number | null;     // null = dropped, never delivered
  announced: boolean;           // MESSAGE_EXPIRED already broadcast?
  forgetAt: number;             // when the ID itself is deleted
}

// NOTE: message TEXT is never stored here. Only the ID and timestamps.
const store = new Map<string, StoredMessage>();

export function getAck(id: string): DeliveryAckPayload | undefined {
  return store.get(id)?.ack;
}

export function accept(m: {
  id: string; sender: string; device_id: string; text: string;
}): { deliver: MessageDeliverPayload; ack: DeliveryAckPayload } {
  const sentAt = Date.now();                       // THE authoritative time
  const expiresAt = sentAt + MESSAGE_LIFETIME_MS;  // sent_at + 30 s
  const ack: DeliveryAckPayload = {
    message_id: m.id, status: 'DELIVERED', sent_at: sentAt, expires_at: expiresAt,
  };
  store.set(m.id, { ack, expiresAt, announced: false, forgetAt: expiresAt + DEDUPE_GRACE_MS });
  return {
    ack,
    deliver: {
      id: m.id, sender: m.sender, device_id: m.device_id, text: m.text,
      sent_at: sentAt, expires_at: expiresAt,
    },
  };
}

export function reject(id: string, reason: string): DeliveryAckPayload {
  const ack: DeliveryAckPayload = {
    message_id: id, status: 'DROPPED', sent_at: null, expires_at: null, reason,
  };
  store.set(id, { ack, expiresAt: null, announced: true, forgetAt: Date.now() + DEDUPE_GRACE_MS });
  return ack;
}

// Returns IDs that just expired. Also forgets old IDs.
export function sweep(now: number): string[] {
  const expired: string[] = [];
  for (const [id, m] of store) {
    if (m.expiresAt !== null && !m.announced && now >= m.expiresAt) {
      m.announced = true;
      expired.push(id);
    }
    if (now >= m.forgetAt) store.delete(id);
  }
  return expired;
}