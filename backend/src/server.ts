import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import { PROTOCOL_VERSION } from './types/protocol';

const PORT = Number(process.env.PORT) || 8080;

const app = express();

// Health check only. It reveals nothing about internals.
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', socket => {
  console.log('client connected');
  socket.on('close', () => console.log('client disconnected'));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`VANISH relay (protocol ${PROTOCOL_VERSION}) listening on port ${PORT}`);
});