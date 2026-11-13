import { createHash, timingSafeEqual } from 'crypto';
import WebSocket from 'ws';
import { JoinPayload, PROTOCOL_VERSION } from '../types/protocol';
import { parseClientPacket } from '../utils/validation';
import { broadcastPresence, Client, clients, onlineCount, send } from './clients';
import { handleMessageSend } from './messageHandler';

const JOIN_TIMEOUT_MS = 10_000;
const PING_INTERVAL_MS = 30_000;
const MAX_STRIKES = 5;

function codeMatches(given: string | undefined): boolean {
  const required = process.env.ROOM_CODE;
  if (!required) return true; // no code configured = open relay
  // Hash both so the comparison takes the same time whatever the input.
  const a = createHash('sha256').update(given ?? '').digest();
  const b = createHash('sha256').update(required).digest();
  return timingSafeEqual(a, b);
}

function strike(client: Client): void {
  client.strikes += 1;
  if (client.strikes >= MAX_STRIKES) {
    send(client.socket, 'DISCONNECT', { reason: 'too_many_invalid_packets' });
    client.socket.close(4004, 'invalid');
  }
}

function handleJoin(client: Client, p: JoinPayload): void {
  if (!codeMatches(p.room_code)) {
    client.locked = true; // ignore everything else from this socket
    // Small delay makes guessing the code slow.
    setTimeout(() => {
      send(client.socket, 'JOIN_ACK', {
        ok: false, server_time: Date.now(), online_count: 0, error: 'invalid_room_code',
      });
      client.socket.close(4003, 'invalid_room_code');
    }, 600);
    return;
  }

  // Duplicate-connection protection: same device joining again replaces the old socket.
  for (const other of clients.values()) {
    if (other !== client && other.joined && other.deviceId === p.device_id) {
      other.joined = false;
      send(other.socket, 'DISCONNECT', { reason: 'replaced_by_new_connection' });
      other.socket.close(4000, 'replaced');
    }
  }

  client.deviceId = p.device_id;
  client.name = p.display_name;
  client.joined = true;

  send(client.socket, 'JOIN_ACK', {
    ok: true, server_time: Date.now(), online_count: onlineCount(),
  });
  broadcastPresence(client.socket); // tell the others
  console.log(`+ student joined (${onlineCount()} online)`);
}

export function handleConnection(socket: WebSocket): void {
  const client: Client = {
    socket, deviceId: null, name: null, joined: false, locked: false,
    alive: true, strikes: 0, sendTimes: [],
  };
  clients.set(socket, client);

  // Must JOIN quickly or be dropped.
  const joinTimer = setTimeout(() => {
    if (!client.joined) socket.close(4001, 'join_timeout');
  }, JOIN_TIMEOUT_MS);

  socket.on('pong', () => { client.alive = true; });

  socket.on('message', (data, isBinary) => {
    client.alive = true;
    if (client.locked) return;
    if (isBinary) return strike(client);

    const result = parseClientPacket(data.toString());
    if (!result.ok) {
      if (result.reason === 'bad_version') {
        if (client.joined) {
          send(socket, 'DISCONNECT', { reason: 'unsupported_version' });
        } else {
          send(socket, 'JOIN_ACK', {
            ok: false, server_time: Date.now(), online_count: 0,
            error: `unsupported_version (relay speaks ${PROTOCOL_VERSION})`,
          });
        }
        socket.close(4002, 'bad_version');
        return;
      }
      return strike(client);
    }

    const packet = result.packet;
    if (!client.joined) {
      if (packet.type === 'JOIN') handleJoin(client, packet.payload);
      else strike(client); // must JOIN first
      return;
    }

    switch (packet.type) {
      case 'MESSAGE_SEND':
        handleMessageSend(client, packet.payload);
        break;
      case 'HEARTBEAT':
        send(socket, 'HEARTBEAT_ACK', { server_time: Date.now(), online_count: onlineCount() });
        break;
      case 'DISCONNECT':
        socket.close(1000, 'client_leave');
        break;
      default:
        break; // JOIN while already joined: ignored
    }
  });

  socket.on('close', () => {
    clearTimeout(joinTimer);
    clients.delete(socket);
    if (client.joined) {
      client.joined = false;
      broadcastPresence();
      console.log(`- student left (${onlineCount()} online)`);
    }
  });

  socket.on('error', () => { /* 'close' follows; nothing to log, never log content */ });
}

// Every 30 s: ping everyone. No answer by the next round = dead connection, remove it.
export function startHeartbeatMonitor(): () => void {
  const timer = setInterval(() => {
    for (const c of clients.values()) {
      if (!c.alive) { c.socket.terminate(); continue; }
      c.alive = false;
      c.socket.ping();
    }
  }, PING_INTERVAL_MS);
  return () => clearInterval(timer);
}