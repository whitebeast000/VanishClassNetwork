import { serverNow } from '../utils/time';
import { expireQueue, purgeExpiredMessages, purgeProcessed } from './storageService';

const PROCESSED_TTL_MS = 5 * 60_000; // remembered IDs (no text) kept 5 minutes
let lastProcessedPurge = 0;

// Runs: on startup, every 500 ms, on app resume, after JOIN.
// Returns true if anything was deleted, so the screen knows to refresh.
export async function runCleanup(): Promise<boolean> {
  const sNow = serverNow();
  const expired = await purgeExpiredMessages(sNow);
  const dropped = await expireQueue(Date.now(), sNow + 5000);

  if (Date.now() - lastProcessedPurge > 60_000) {
    lastProcessedPurge = Date.now();
    await purgeProcessed(sNow - PROCESSED_TTL_MS);
  }
  return expired + dropped > 0;
}