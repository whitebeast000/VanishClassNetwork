import { randomUUID } from 'crypto';
import readline from 'readline';
import WebSocket from 'ws';
import { PROTOCOL_VERSION } from '../types/protocol';

const URL = process.env.RELAY_URL ?? 'ws://localhost:8080';
const NAME = process.env.BOT_NAME ?? 'Bot';
const deviceId = randomUUID();

let ws: WebSocket | null = null;
let joined = false;

const send = (type: string, payload: object) =>
  ws?.send(JSON.stringify({ version: PROTOCOL_VERSION, type, payload }));

function connect() {
  const socket = new WebSocket(URL);
  ws = socket;
  socket.on('open', () =>
    send('JOIN', { device_id: deviceId, display_name: NAME, room_code: process.env.ROOM_CODE }));
  socket.on('message', raw => {
    const p = JSON.parse(raw.toString());
    if (p.type === 'JOIN_ACK') {
      joined = p.payload.ok;
      console.log(joined ? `Joined as ${NAME}. Type a message and press Enter.` : 'Refused: ' + p.payload.error);
    }
    if (p.type === 'MESSAGE_DELIVER') {
      const left = Math.round((p.payload.expires_at - Date.now()) / 1000);
      console.log(`[${p.payload.sender}] ${p.payload.text}   (about ${left}s left)`);
    }
    if (p.type === 'DELIVERY_ACK') console.log('  ack:', p.payload.status, p.payload.reason ?? '');
  });
  socket.on('close', () => {
    joined = false;
    console.log('Disconnected. Retrying in 2 seconds...');
    setTimeout(connect, 2000);
  });
  socket.on('error', () => { /* close follows */ });
}

connect();
setInterval(() => { if (joined) send('HEARTBEAT', { client_time: Date.now() }); }, 15_000);

readline.createInterface({ input: process.stdin }).on('line', line => {
  const text = line.trim();
  if (!text) return;
  if (!joined) return console.log('Not connected, message not sent.');
  send('MESSAGE_SEND', { id: randomUUID(), sender: NAME, device_id: deviceId, text, queued_ms: 0 });
});