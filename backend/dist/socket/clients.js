"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clients = void 0;
exports.onlineCount = onlineCount;
exports.send = send;
exports.broadcast = broadcast;
exports.broadcastPresence = broadcastPresence;
const ws_1 = __importDefault(require("ws"));
const protocol_1 = require("../types/protocol");
exports.clients = new Map();
function onlineCount() {
    let n = 0;
    for (const c of exports.clients.values())
        if (c.joined)
            n++;
    return n;
}
function send(socket, type, payload) {
    if (socket.readyState !== ws_1.default.OPEN)
        return;
    socket.send(JSON.stringify((0, protocol_1.makePacket)(type, payload)));
}
function broadcast(type, payload, except) {
    const data = JSON.stringify((0, protocol_1.makePacket)(type, payload)); // build once, send to all
    for (const c of exports.clients.values()) {
        if (!c.joined || c.socket === except || c.socket.readyState !== ws_1.default.OPEN)
            continue;
        c.socket.send(data);
    }
}
// Tells everyone the new online count (see protocol note 1).
function broadcastPresence(except) {
    broadcast('HEARTBEAT_ACK', { server_time: Date.now(), online_count: onlineCount() }, except);
}
