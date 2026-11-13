import { ConnectionState } from '../types/connection';
import {
  DeliveryAckPayload, HEARTBEAT_INTERVAL_MS, JoinAckPayload, makePacket,
  MessageDeliverPayload, MessageExpiredPayload, PacketType, PayloadMap, PROTOCOL_VERSION,
} from '../types/protocol';
import { syncClock } from '../utils/time';

export interface SocketConfig { url: string; deviceId: string; name: string; code: string }

export interface SocketEvents {
  onState(state: ConnectionState, detail: string | null): void;
  onOnline(count: number): void;
  onJoined(clockOffset: number): void;
  onDeliver(p: MessageDeliverPayload): void;
  onAck(p: DeliveryAckPayload): void;
  onExpired(p: MessageExpiredPayload): void;
  onClosed(): void;
}

const CONNECT_TIMEOUT_MS = 10_000;
const MAX_BACKOFF_MS = 15_000;
const STALE_MS = HEARTBEAT_INTERVAL_MS * 2.5; // no traffic this long = dead
type Timer = ReturnType<typeof setTimeout>;
const mono = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

class SocketService {
  private ws: WebSocket | null = null;
  private cfg: SocketConfig | null = null;
  private ev: SocketEvents | null = null;
  private state: ConnectionState = 'DISCONNECTED';
  // "gen" numbers each socket. Callbacks from an old socket see a different
  // number and are ignored. This is the duplicate-socket protection.
  private gen = 0;
  private attempt = 0;
  private joined = false;
  private everJoined = false;
  private interactive = false; // true while the user presses "Join": fail fast, no retries
  private fatal = false;       // wrong code / wrong version / replaced: never auto-retry
  private joinSentAt = 0;
  private hbSentAt: number | null = null;
  private lastRx = 0;
  private connectTimer: Timer | null = null;
  private retryTimer: Timer | null = null;
  private hbTimer: ReturnType<typeof setInterval> | null = null;

  setEvents(ev: SocketEvents): void { this.ev = ev; }
  getState(): ConnectionState { return this.state; }
  isReady(): boolean {
    return this.joined && this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  // ----- public controls -----
  start(cfg: SocketConfig, interactive: boolean): void {
    this.stop();
    this.cfg = cfg;
    this.interactive = interactive;
    this.fatal = false;
    this.everJoined = false;
    this.attempt = 0;
    this.open();
  }

  // User leaves on purpose.
  stop(): void {
    if (this.isReady()) this.send('DISCONNECT', { reason: 'client_leave' });
    this.gen++;
    this.clearTimers();
    this.detach();
    this.cfg = null;
    this.fatal = false;
    this.setState('DISCONNECTED', null);
  }

  // Skip the backoff wait and connect now (network came back, app resumed, button).
  reconnectNow(force = false): void {
    if (!this.cfg) return;
    if (this.fatal && !force) return;
    if (this.state === 'CONNECTED' && this.isReady()) return;
    this.fatal = false;
    this.interactive = false;
    this.clearTimers();
    this.gen++;
    this.detach();
    this.attempt = 0;
    this.open();
  }

  // Network was lost: do not wait for the heartbeat to notice.
  forceDrop(): void {
    if (this.ws) this.handleClose(this.gen, 'Network lost.');
  }

  // After the app returns from background: is the socket still alive?
  probe(): void {
    if (!this.isReady()) return;
    const g = this.gen;
    const t = mono();
    this.beat();
    setTimeout(() => {
      if (g === this.gen && this.joined && this.lastRx < t) this.handleClose(g, 'Connection lost.');
    }, 4000);
  }

  send<T extends PacketType>(type: T, payload: PayloadMap[T]): boolean {
    if (!this.isReady() || !this.ws) return false;
    try {
      this.ws.send(JSON.stringify(makePacket(type, payload)));
      return true;
    } catch {
      return false;
    }
  }

  // ----- internals -----
  private setState(state: ConnectionState, detail: string | null): void {
    this.state = state;
    this.ev?.onState(state, detail);
  }

  private open(): void {
    const cfg = this.cfg;
    if (!cfg) return;
    this.clearTimers();
    const gen = ++this.gen;
    this.setState(!this.everJoined && this.attempt === 0 ? 'CONNECTING' : 'RECONNECTING', null);

    let ws: WebSocket;
    try {
      ws = new WebSocket(cfg.url);
    } catch {
      this.handleClose(gen, 'Invalid relay address.');
      return;
    }
    this.ws = ws;
    this.joined = false;
    this.lastRx = mono();
    this.connectTimer = setTimeout(() => this.handleClose(gen, 'Connection timed out.'), CONNECT_TIMEOUT_MS);

    ws.onopen = () => {
      if (gen !== this.gen) return;
      this.joinSentAt = mono();
      ws.send(JSON.stringify(makePacket('JOIN', {
        device_id: cfg.deviceId, display_name: cfg.name, room_code: cfg.code || undefined,
      })));
    };
    ws.onmessage = e => {
      if (gen !== this.gen) return;
      this.lastRx = mono();
      this.onPacket(e.data);
    };
    ws.onerror = () => { /* onclose always follows */ };
    ws.onclose = () => this.handleClose(gen, null);
  }

  private handleClose(gen: number, reason: string | null): void {
    if (gen !== this.gen) return; // stale socket
    this.gen++;                   // from now on this socket's callbacks are ignored
    this.clearTimers();
    this.detach();
    this.ev?.onClosed();
    if (this.fatal) return;
    if (this.interactive && !this.everJoined) {
      this.setState('ERROR', reason ?? 'Could not reach the relay. Check the address and your network.');
      return;
    }
    const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** this.attempt) + Math.random() * 500;
    this.attempt++;
    this.setState('RECONNECTING', reason);
    this.retryTimer = setTimeout(() => this.open(), delay);
  }

  private fatalError(reason: string): void {
    this.fatal = true;
    this.clearTimers();
    this.gen++;
    this.detach();
    this.ev?.onClosed();
    this.setState('ERROR', reason);
  }

  private detach(): void {
    const w = this.ws;
    this.ws = null;
    this.joined = false;
    if (w) {
      try { w.close(); } catch { /* already closed */ }
    }
  }

  private clearTimers(): void {
    if (this.connectTimer) clearTimeout(this.connectTimer);
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.hbTimer) clearInterval(this.hbTimer);
    this.connectTimer = this.retryTimer = null;
    this.hbTimer = null;
  }

  private beat(): void {
    if (!this.isReady()) return;
    if (mono() - this.lastRx > STALE_MS) {
      this.handleClose(this.gen, 'Connection lost.');
      return;
    }
    this.hbSentAt = mono();
    this.send('HEARTBEAT', { client_time: Date.now() });
  }

  private onPacket(raw: unknown): void {
    let pkt: any;
    try { pkt = JSON.parse(String(raw)); } catch { return; }
    if (!pkt || pkt.version !== PROTOCOL_VERSION || typeof pkt.type !== 'string' || !pkt.payload) return;
    const p = pkt.payload;

    switch (pkt.type) {
      case 'JOIN_ACK':
        this.onJoinAck(p as JoinAckPayload);
        break;
      case 'HEARTBEAT_ACK':
        if (typeof p.online_count === 'number') this.ev?.onOnline(p.online_count);
        // Only the answer to OUR heartbeat is used to re-sync the clock.
        if (this.hbSentAt !== null && typeof p.server_time === 'number') {
          const rtt = mono() - this.hbSentAt;
          this.hbSentAt = null;
          if (rtt < 1500) syncClock(p.server_time, rtt);
        }
        break;
      case 'MESSAGE_DELIVER':
        if (this.joined && typeof p.id === 'string' && typeof p.text === 'string' &&
            typeof p.sender === 'string' && typeof p.device_id === 'string' &&
            typeof p.sent_at === 'number' && typeof p.expires_at === 'number') {
          this.ev?.onDeliver(p as MessageDeliverPayload);
        }
        break;
      case 'DELIVERY_ACK':
        if (this.joined && typeof p.message_id === 'string' &&
            (p.status === 'DELIVERED' || p.status === 'DROPPED')) {
          this.ev?.onAck(p as DeliveryAckPayload);
        }
        break;
      case 'MESSAGE_EXPIRED':
        if (this.joined && typeof p.message_id === 'string') this.ev?.onExpired(p as MessageExpiredPayload);
        break;
      case 'DISCONNECT':
        this.fatalError(
          p.reason === 'replaced_by_new_connection'
            ? 'This device joined from another connection.'
            : `The relay closed the connection (${String(p.reason ?? 'unknown')}).`,
        );
        break;
      default:
        break;
    }
  }

  private onJoinAck(p: JoinAckPayload): void {
    if (!p.ok) {
      const e = String(p.error ?? '');
      this.fatalError(
        e === 'invalid_room_code' ? 'Wrong class code.'
          : e.startsWith('unsupported_version') ? 'This app version does not match the relay.'
          : e || 'The relay refused the join.',
      );
      return;
    }
    // Connected ONLY now: handshake done AND relay accepted the JOIN.
    const rtt = mono() - this.joinSentAt;
    const offset = syncClock(p.server_time, rtt);
    if (this.connectTimer) clearTimeout(this.connectTimer);
    this.connectTimer = null;
    this.joined = true;
    this.everJoined = true;
    this.attempt = 0;
    this.hbTimer = setInterval(() => this.beat(), HEARTBEAT_INTERVAL_MS);
    this.setState('CONNECTED', null);
    this.ev?.onOnline(p.online_count);
    this.ev?.onJoined(offset);
  }
}

export const socketService = new SocketService();