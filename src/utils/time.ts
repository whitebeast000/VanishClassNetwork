// The authoritative clock. Everything calls serverNow().
//
// After JOIN we know: relay time (+ half the round trip) at one moment of the
// phone's MONOTONIC timer (performance.now). It only counts forward and ignores
// manual clock changes. serverNow() = anchor + time elapsed on that timer.

let anchorServer: number | null = null;
let anchorMono = 0;
let savedOffset = 0; // used only between app start and the first JOIN_ACK

const mono = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

// Returns the offset (relay - phone wall clock) so it can be saved.
export function syncClock(serverTime: number, rttMs: number): number {
  anchorServer = serverTime + rttMs / 2;
  anchorMono = mono();
  return anchorServer - Date.now();
}

export function setSavedOffset(offset: number): void {
  savedOffset = Number.isFinite(offset) ? offset : 0;
}

export function isClockSynced(): boolean {
  return anchorServer !== null;
}

export function serverNow(): number {
  if (anchorServer !== null) return anchorServer + (mono() - anchorMono);
  return Date.now() + savedOffset;
}

export function remainingMs(expiresAt: number): number {
  return Math.max(0, expiresAt - serverNow());
}

export function formatClock(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}