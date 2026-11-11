// Phase 5 replaces this with the relay-synced clock.
// Every component calls serverNow(), so nothing else needs to change.
export function serverNow(): number {
  return Date.now();
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