import WebSocket from 'ws';
import { makePacket, PacketType, PayloadMap } from '../types/protocol';

export interface Client {
  socket: WebSocket;
  deviceId: string | null;
  name: string | null;
  joined: boolean;      // true only after a successful JOIN
  locked: boolean;      // true while a failed JOIN is being answered
  alive: boolean;       // heartbeat bookkeeping
  strikes: number;      // count of invalid packets
  sendTimes: number[];  // for rate limiting
}

export const clients = new Map<WebSocket, Client>();

export function onlineCount(): number {
  let n = 0;
  for (const c of clients.values()) if (c.joined) n++;
  return n;
}

export function send<T extends PacketType>(socket: WebSocket, type: T, payload: PayloadMap[T]): void {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(makePacket(type, payload)));
}

export function broadcast<T extends PacketType>(
  type: T, payload: PayloadMap[T], except?: WebSocket,
): void {
  const data = JSON.stringify(makePacket(type, payload)); // build once, send to all
  for (const c of clients.values()) {
    if (!c.joined || c.socket === except || c.socket.readyState !== WebSocket.OPEN) continue;
    c.socket.send(data);
  }
}

// Tells everyone the new online count (see protocol note 1).
export function broadcastPresence(except?: WebSocket): void {
  broadcast('HEARTBEAT_ACK', { server_time: Date.now(), online_count: onlineCount() }, except);
}