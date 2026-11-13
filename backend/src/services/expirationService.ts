import { broadcast } from '../socket/clients';
import { sweep } from './messageService';

// Every 500 ms: find messages whose expires_at has passed and tell everyone.
export function startExpirationService(): () => void {
  const timer = setInterval(() => {
    for (const id of sweep(Date.now())) {
      broadcast('MESSAGE_EXPIRED', { message_id: id });
    }
  }, 500);
  return () => clearInterval(timer);
}