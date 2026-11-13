import { accept, getAck, reject } from '../services/messageService';
import { MAX_QUEUE_AGE_MS, MessageSendPayload } from '../types/protocol';
import { broadcast, Client, send } from './clients';

const RATE_WINDOW_MS = 10_000;
const RATE_MAX = 10; // max messages per student per 10 s

export function handleMessageSend(client: Client, p: MessageSendPayload): void {
  // 1. A student may only send as themselves.
  if (p.device_id !== client.deviceId) return;

  // 2. Duplicate ID: repeat the original answer, forward nothing.
  const previous = getAck(p.id);
  if (previous) {
    send(client.socket, 'DELIVERY_ACK', previous);
    return;
  }

  // 3. Spam protection.
  const now = Date.now();
  client.sendTimes = client.sendTimes.filter(t => now - t < RATE_WINDOW_MS);
  if (client.sendTimes.length >= RATE_MAX) {
    send(client.socket, 'DELIVERY_ACK', reject(p.id, 'rate_limited'));
    return;
  }

  // 4. Waited offline too long on the phone: never deliver.
  if (p.queued_ms > MAX_QUEUE_AGE_MS) {
    send(client.socket, 'DELIVERY_ACK', reject(p.id, 'queue_age_exceeded'));
    return;
  }

  // 5. Accept. The relay sets sent_at and expires_at here.
  client.sendTimes.push(now);
  const { ack, deliver } = accept({
    id: p.id,
    sender: client.name as string, // trusted name from JOIN, not from the packet
    device_id: p.device_id,
    text: p.text,
  });
  send(client.socket, 'DELIVERY_ACK', ack);
  broadcast('MESSAGE_DELIVER', deliver, client.socket); // everyone except the sender
}