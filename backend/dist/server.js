"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const ws_1 = require("ws");
const expirationService_1 = require("./services/expirationService");
const connectionHandler_1 = require("./socket/connectionHandler");
const protocol_1 = require("./types/protocol");
const PORT = Number(process.env.PORT) || 8080;
const app = (0, express_1.default)();
app.disable('x-powered-by');
app.get('/health', (_req, res) => { res.json({ status: 'ok' }); }); // reveals nothing
const server = http_1.default.createServer(app);
const wss = new ws_1.WebSocketServer({ server, maxPayload: 4096 }); // tiny packets only
wss.on('connection', connectionHandler_1.handleConnection);
const stopExpiry = (0, expirationService_1.startExpirationService)();
const stopHeartbeat = (0, connectionHandler_1.startHeartbeatMonitor)();
server.listen(PORT, '0.0.0.0', () => {
    console.log(`VANISH relay (protocol ${protocol_1.PROTOCOL_VERSION}) on port ${PORT}`);
    console.log(process.env.ROOM_CODE ? 'Room code: ENABLED' : 'Room code: NOT SET (open relay)');
});
function shutdown() {
    stopExpiry();
    stopHeartbeat();
    wss.close();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1500);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
