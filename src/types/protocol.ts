// AUTO-COPIED from /protocol/protocol.ts. DO NOT EDIT HERE.
// Edit the source file and run: npm run sync-protocol

// VANISH shared protocol, version 1.0
// This is the ONLY place the protocol is defined.
// After editing, run:  npm run sync-protocol

export const PROTOCOL_VERSION = '1.0';

// Shared limits. Both client and relay read these.
export const MESSAGE_LIFETIME_MS = 30_000; // visible life, starts at relay delivery
export const MAX_QUEUE_AGE_MS = 60_000; // max wait while offline
export const MAX_TEXT_LENGTH = 280;
export const MAX_NAME_LENGTH = 24;
export const HEARTBEAT_INTERVAL_MS = 15_000;

export type MessageStatus =
  | 'CREATED'
  | 'WAITING'
  | 'SENT'
  | 'DELIVERED'
  | 'DISPLAYED'
  | 'EXPIRED'
  | 'DROPPED';

export interface Message {
  id: string;
  sender: string;
  device_id: string;
  text: string;
  sent_at: number | null; // relay time, ms
  expires_at: number | null; // relay time, ms
  status: MessageStatus;
}

export type PacketType =
  | 'JOIN'
  | 'JOIN_ACK'
  | 'MESSAGE_SEND'
  | 'MESSAGE_DELIVER'
  | 'DELIVERY_ACK'
  | 'MESSAGE_EXPIRED'
  | 'HEARTBEAT'
  | 'HEARTBEAT_ACK'
  | 'DISCONNECT';

// ---- Payloads ----
export interface JoinPayload {
  device_id: string;
  display_name: string;
  room_code?: string;
}
export interface JoinAckPayload {
  ok: boolean;
  server_time: number;
  online_count: number;
  error?: string;
}
export interface MessageSendPayload {
  id: string;
  sender: string;
  device_id: string;
  text: string;
  queued_ms: number; // how long it waited offline on the phone
}
export interface MessageDeliverPayload {
  id: string;
  sender: string;
  device_id: string;
  text: string;
  sent_at: number;
  expires_at: number;
}
export interface DeliveryAckPayload {
  message_id: string;
  status: 'DELIVERED' | 'DROPPED';
  sent_at: number | null;
  expires_at: number | null;
  reason?: string;
}
export interface MessageExpiredPayload {
  message_id: string;
}
export interface HeartbeatPayload {
  client_time: number;
}
export interface HeartbeatAckPayload {
  server_time: number;
  online_count: number;
}
export interface DisconnectPayload {
  reason?: string;
}

// ---- Packet = envelope + typed payload ----
export interface PayloadMap {
  JOIN: JoinPayload;
  JOIN_ACK: JoinAckPayload;
  MESSAGE_SEND: MessageSendPayload;
  MESSAGE_DELIVER: MessageDeliverPayload;
  DELIVERY_ACK: DeliveryAckPayload;
  MESSAGE_EXPIRED: MessageExpiredPayload;
  HEARTBEAT: HeartbeatPayload;
  HEARTBEAT_ACK: HeartbeatAckPayload;
  DISCONNECT: DisconnectPayload;
}

export interface Packet<T extends PacketType = PacketType> {
  version: string;
  type: T;
  payload: PayloadMap[T];
}

export function makePacket<T extends PacketType>(
  type: T,
  payload: PayloadMap[T],
): Packet<T> {
  return { version: PROTOCOL_VERSION, type, payload };
}