import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAppLifecycle } from '../hooks/useAppLifecycle';
import { runCleanup } from '../services/expirationService';
import {
  createOutgoing, flushQueue, handleAck, handleDeliver, handleExpired, resetInFlight,
} from '../services/messageService';
import { subscribeNetwork } from '../services/networkService';
import { socketService } from '../services/socketService';
import * as store from '../services/storageService';
import { ConnectionState } from '../types/connection';
import { MAX_NAME_LENGTH, MAX_TEXT_LENGTH } from '../types/protocol';
import { isValidRelayUrl } from '../utils/relay';
import { serverNow, setSavedOffset } from '../utils/time';

interface Profile { name: string; deviceId: string; relayUrl: string; roomCode: string }
interface JoinResult { ok: boolean; error?: string }

interface ChatContextValue {
  ready: boolean;
  hasProfile: boolean;
  name: string;
  deviceId: string;
  relayUrl: string;
  roomCode: string;
  connection: ConnectionState;
  connectionDetail: string | null;
  online: number;
  networkOnline: boolean;
  messages: store.StoredMessage[];
  storage: { messages: number; queue: number };
  join(name: string, relay: string, code: string): Promise<JoinResult>;
  send(text: string): Promise<void>;
  reconnect(): void;
  leave(): Promise<void>;
  updateName(name: string): Promise<string | null>;
  updateRelay(url: string, code: string): Promise<string | null>;
}

const Ctx = createContext<ChatContextValue | null>(null);

export function useChat(): ChatContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useChat must be used inside ChatProvider');
  return v;
}

const safe = (p: Promise<unknown>): void => { p.catch(() => undefined); };

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile>({ name: '', deviceId: '', relayUrl: '', roomCode: '' });
  const [connection, setConnection] = useState<ConnectionState>('DISCONNECTED');
  const [detail, setDetail] = useState<string | null>(null);
  const [online, setOnline] = useState(0);
  const [networkOnline, setNetworkOnline] = useState(true);
  const [messages, setMessages] = useState<store.StoredMessage[]>([]);
  const [storage, setStorage] = useState({ messages: 0, queue: 0 });

  const profileRef = useRef<Profile>(profile);
  const joinResolver = useRef<((r: JoinResult) => void) | null>(null);
  const refreshSeq = useRef(0);
  const cleaning = useRef(false);

  const commitProfile = useCallback((next: Profile) => {
    profileRef.current = next; // the ref is updated at once; state follows
    setProfile(next);
  }, []);

  // Copy the database into screen state. Only the newest result is applied.
  const refresh = useCallback(async () => {
    const seq = ++refreshSeq.current;
    const [list, c] = await Promise.all([store.loadActive(serverNow()), store.counts()]);
    if (seq === refreshSeq.current) {
      setMessages(list);
      setStorage(c);
    }
  }, []);

  const cleanupAndRefresh = useCallback(async () => {
    if (cleaning.current) return;
    cleaning.current = true;
    try {
      if (await runCleanup()) await refresh();
    } finally {
      cleaning.current = false;
    }
  }, [refresh]);

  // ----- socket events -----
  useEffect(() => {
    socketService.setEvents({
      onState: (s, d) => {
        setConnection(s);
        setDetail(d);
        const r = joinResolver.current;
        if (r && s === 'CONNECTED') { joinResolver.current = null; r({ ok: true }); }
        else if (r && s === 'ERROR') { joinResolver.current = null; r({ ok: false, error: d ?? 'Could not connect.' }); }
      },
      onOnline: n => setOnline(n),
      onJoined: offset => {
        setSavedOffset(offset);
        safe(store.setSetting('clock_offset', String(Math.round(offset))));
        safe(runCleanup().then(() => refresh()));
        const p = profileRef.current;
        safe(flushQueue(p.name, p.deviceId).then(() => refresh())); // send waiting messages
      },
      onDeliver: m => {
        safe(handleDeliver(m, profileRef.current.deviceId).then(isNew => { if (isNew) return refresh(); }));
      },
      onAck: a => { safe(handleAck(a).then(() => refresh())); },
      onExpired: e => { safe(handleExpired(e).then(() => refresh())); },
      onClosed: () => resetInFlight(),
    });
  }, [refresh]);

  // ----- startup -----
  useEffect(() => {
    (async () => {
      const deviceId = await store.getOrCreateDeviceId();
      const [name, relay, code, off] = await Promise.all([
        store.getSetting('display_name'), store.getSetting('relay_url'),
        store.getSetting('room_code'), store.getSetting('clock_offset'),
      ]);
      if (off) setSavedOffset(Number(off));
      await runCleanup(); // expired messages are deleted before anything is shown
      const p: Profile = { name: name ?? '', deviceId, relayUrl: relay ?? '', roomCode: code ?? '' };
      commitProfile(p);
      await refresh();
      setReady(true);
      if (p.name && p.relayUrl) {
        socketService.start({ url: p.relayUrl, deviceId, name: p.name, code: p.roomCode }, false);
      }
    })().catch(e => {
      setConnection('ERROR');
      setDetail('Storage error: ' + String(e));
      setReady(true);
    });
  }, [commitProfile, refresh]);

  // ----- cleanup tick: absolute expires_at is checked every 500 ms -----
  useEffect(() => {
    const id = setInterval(() => { safe(cleanupAndRefresh()); }, 500);
    return () => clearInterval(id);
  }, [cleanupAndRefresh]);

  // ----- app resume -----
  useAppLifecycle(() => {
    safe(cleanupAndRefresh());
    const s = socketService.getState();
    if (s === 'RECONNECTING') socketService.reconnectNow();
    else if (s === 'CONNECTED') socketService.probe();
  });

  // ----- network changes -----
  useEffect(() => subscribeNetwork(isOnline => {
    setNetworkOnline(isOnline);
    if (isOnline) {
      if (socketService.getState() === 'RECONNECTING') socketService.reconnectNow();
    } else if (socketService.getState() === 'CONNECTED') {
      socketService.forceDrop();
    }
  }), []);

  // ----- actions -----
  const join = useCallback(async (nameIn: string, relayIn: string, codeIn: string): Promise<JoinResult> => {
    const prev = profileRef.current;
    const next: Profile = { ...prev, name: nameIn.trim(), relayUrl: relayIn.trim(), roomCode: codeIn.trim() };
    commitProfile(next);
    const result = await new Promise<JoinResult>(resolve => {
      joinResolver.current = resolve;
      socketService.start(
        { url: next.relayUrl, deviceId: next.deviceId, name: next.name, code: next.roomCode }, true,
      );
    });
    if (result.ok) {
      await store.setSetting('display_name', next.name);
      await store.setSetting('relay_url', next.relayUrl);
      await store.setSetting('room_code', next.roomCode);
    } else {
      socketService.stop();
      commitProfile(prev);
    }
    return result;
  }, [commitProfile]);

  const send = useCallback(async (text: string) => {
    const p = profileRef.current;
    const t = text.trim().slice(0, MAX_TEXT_LENGTH);
    if (!t) return;
    const id = await createOutgoing(p.name, p.deviceId, t); // CREATED
    await refresh();
    if (socketService.isReady()) await flushQueue(p.name, p.deviceId); // -> SENT
    else await store.markOutgoing(id, 'WAITING');                      // -> WAITING
    await refresh();
  }, [refresh]);

  const reconnect = useCallback(() => socketService.reconnectNow(true), []);

  const leave = useCallback(async () => {
    socketService.stop();
    await store.clearAll();
    await store.deleteSetting('display_name');
    commitProfile({ ...profileRef.current, name: '' });
    setMessages([]);
    setStorage({ messages: 0, queue: 0 });
    setOnline(0);
  }, [commitProfile]);

  const updateName = useCallback(async (nameIn: string): Promise<string | null> => {
    const n = nameIn.trim();
    if (n.length < 2 || n.length > MAX_NAME_LENGTH) return `Name must be 2 to ${MAX_NAME_LENGTH} characters.`;
    const p = profileRef.current;
    await store.setSetting('display_name', n);
    commitProfile({ ...p, name: n });
    socketService.start({ url: p.relayUrl, deviceId: p.deviceId, name: n, code: p.roomCode }, false);
    return null;
  }, [commitProfile]);

  const updateRelay = useCallback(async (url: string, code: string): Promise<string | null> => {
    if (!isValidRelayUrl(url)) return 'Relay address must look like ws://192.168.1.5:8080 or wss://host.com';
    const p = profileRef.current;
    const next = { ...p, relayUrl: url.trim(), roomCode: code.trim() };
    await store.setSetting('relay_url', next.relayUrl);
    await store.setSetting('room_code', next.roomCode);
    commitProfile(next);
    socketService.start({ url: next.relayUrl, deviceId: p.deviceId, name: p.name, code: next.roomCode }, false);
    return null;
  }, [commitProfile]);

  const value: ChatContextValue = {
    ready,
    hasProfile: profile.name.length > 0 && profile.relayUrl.length > 0,
    name: profile.name, deviceId: profile.deviceId,
    relayUrl: profile.relayUrl, roomCode: profile.roomCode,
    connection, connectionDetail: detail, online, networkOnline,
    messages, storage,
    join, send, reconnect, leave, updateName, updateRelay,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}