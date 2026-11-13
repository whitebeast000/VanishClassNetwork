import { randomUUID } from 'crypto';
import WebSocket from 'ws';
import { PROTOCOL_VERSION } from '../types/protocol';

const URL = process.env.RELAY_URL ?? 'ws://localhost:8080';
const CODE = process.env.ROOM_CODE;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

class Phone {
  ws!: WebSocket;
  inbox: any[] = [];
  deviceId = randomUUID();
  constructor(public name: string) {}

  open(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(URL);
      this.ws.on('open', () => resolve());
      this.ws.on('error', reject);
      this.ws.on('message', d => this.inbox.push(JSON.parse(d.toString())));
    });
  }
  send(type: string, payload: object, version = PROTOCOL_VERSION) {
    this.ws.send(JSON.stringify({ version, type, payload }));
  }
  async waitFor(type: string, pred: (p: any) => boolean = () => true, ms = 3000) {
    const start = Date.now();
    while (Date.now() - start < ms) {
      const i = this.inbox.findIndex(p => p.type === type && pred(p.payload));
      if (i >= 0) return this.inbox.splice(i, 1)[0].payload;
      await sleep(25);
    }
    throw new Error(`${this.name}: timeout waiting for ${type}`);
  }
  async expectNone(type: string, pred: (p: any) => boolean = () => true, ms = 600) {
    await sleep(ms);
    if (this.inbox.some(p => p.type === type && pred(p.payload))) {
      throw new Error(`${this.name}: unexpected ${type}`);
    }
  }
  async join(code = CODE) {
    await this.open();
    this.send('JOIN', { device_id: this.deviceId, display_name: this.name, room_code: code });
    return this.waitFor('JOIN_ACK');
  }
  msg(id: string, text: string, queued_ms = 0, device_id = this.deviceId) {
    this.send('MESSAGE_SEND', { id, sender: this.name, device_id, text, queued_ms });
  }
}

function pass(label: string) { console.log('PASS ', label); }
function assert(cond: boolean, label: string) {
  if (!cond) throw new Error('FAIL: ' + label);
  pass(label);
}

async function main() {
  // 1. Wrong code is refused
  if (CODE) {
    const x = new Phone('Intruder');
    const ack = await x.join('wrong-code');
    assert(ack.ok === false && ack.error === 'invalid_room_code', 'wrong room code is rejected');
  }

  // 2. Wrong protocol version is refused
  const v = new Phone('OldApp');
  await v.open();
  v.send('JOIN', { device_id: v.deviceId, display_name: 'OldApp', room_code: CODE }, '9.9');
  const vAck = await v.waitFor('JOIN_ACK');
  assert(vAck.ok === false && String(vAck.error).startsWith('unsupported_version'), 'wrong protocol version is rejected');

  // 3. Three phones join, counts are correct
  const A = new Phone('Alice'), B = new Phone('Bilal'), C = new Phone('Chand');
  const a = await A.join(); assert(a.ok && a.online_count === 1, 'A joins, 1 online');
  await B.join();
  await A.waitFor('HEARTBEAT_ACK', p => p.online_count === 2);
  const c = await C.join(); assert(c.ok && c.online_count === 3, 'C joins, 3 online');
  await A.waitFor('HEARTBEAT_ACK', p => p.online_count === 3);
  pass('others are told about new participants');

  // 4. Basic messaging: same timestamps everywhere, expires = sent + 30 s
  const id1 = randomUUID();
  A.msg(id1, 'hello class');
  const dB = await B.waitFor('MESSAGE_DELIVER');
  const dC = await C.waitFor('MESSAGE_DELIVER');
  const ackA = await A.waitFor('DELIVERY_ACK');
  const deliveredAt = Date.now();
  assert(dB.text === 'hello class' && dB.sender === 'Alice', 'B receives text and sender name');
  assert(dB.expires_at === dC.expires_at && dB.expires_at === ackA.expires_at, 'A, B, C share the same expires_at');
  assert(dB.expires_at - dB.sent_at === 30000, 'expires_at = sent_at + 30000');
  await A.expectNone('MESSAGE_DELIVER');
  pass('sender does not get its own message back');

  // 5. Duplicate ID: same ack again, no second delivery
  A.msg(id1, 'hello class');
  const again = await A.waitFor('DELIVERY_ACK');
  assert(again.expires_at === ackA.expires_at, 'duplicate gets the ORIGINAL ack');
  await B.expectNone('MESSAGE_DELIVER');
  pass('duplicate is not forwarded');

  // 6. Too old from the offline queue
  const id2 = randomUUID();
  A.msg(id2, 'too late', 61_000);
  const dropped = await A.waitFor('DELIVERY_ACK', p => p.message_id === id2);
  assert(dropped.status === 'DROPPED' && dropped.reason === 'queue_age_exceeded', 'over-age message is DROPPED');
  await B.expectNone('MESSAGE_DELIVER', p => p.id === id2);
  pass('over-age message never reaches B');

  // 7. Spoofed device id is ignored
  const id3 = randomUUID();
  A.msg(id3, 'spoof', 0, randomUUID());
  await B.expectNone('MESSAGE_DELIVER', p => p.id === id3);
  pass('spoofed device_id is ignored');

  // 8. Expiry announcement at ~30 s
  console.log('...waiting ~30 s for MESSAGE_EXPIRED');
  await B.waitFor('MESSAGE_EXPIRED', p => p.message_id === id1, 33_000);
  const elapsed = Date.now() - deliveredAt;
  assert(elapsed > 29_000 && elapsed < 32_000, `MESSAGE_EXPIRED arrived after ${elapsed} ms`);

  // 9. Leaving updates the count
  C.ws.close();
  await A.waitFor('HEARTBEAT_ACK', p => p.online_count === 2);
  pass('count drops when a student leaves');

  console.log('\nALL TESTS PASSED');
  process.exit(0);
}

main().catch(e => { console.error(String(e)); process.exit(1); });