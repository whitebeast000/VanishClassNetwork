import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import { startExpirationService } from './services/expirationService';
import { handleConnection, startHeartbeatMonitor } from './socket/connectionHandler';
import { PROTOCOL_VERSION } from './types/protocol';

const PORT = Number(process.env.PORT) || 8080;

const app = express();
app.disable('x-powered-by');
app.get('/health', (_req, res) => { res.json({ status: 'ok' }); }); // reveals nothing

const server = http.createServer(app);
const wss = new WebSocketServer({ server, maxPayload: 4096 }); // tiny packets only
wss.on('connection', handleConnection);

const stopExpiry = startExpirationService();
const stopHeartbeat = startHeartbeatMonitor();

server.listen(PORT, '0.0.0.0', () => {
  console.log(`VANISH relay (protocol ${PROTOCOL_VERSION}) on port ${PORT}`);
  console.log(process.env.ROOM_CODE ? 'Room code: ENABLED' : 'Room code: NOT SET (open relay)');
});

function shutdown(): void {
  stopExpiry();
  stopHeartbeat();
  wss.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);