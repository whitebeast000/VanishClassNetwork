"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleConnection = handleConnection;
exports.startHeartbeatMonitor = startHeartbeatMonitor;
const crypto_1 = require("crypto");
const protocol_1 = require("../types/protocol");
const validation_1 = require("../utils/validation");
const clients_1 = require("./clients");
const messageHandler_1 = require("./messageHandler");
const JOIN_TIMEOUT_MS = 10_000;
const PING_INTERVAL_MS = 30_000;
const MAX_STRIKES = 5;
function codeMatches(given) {
    const required = process.env.ROOM_CODE;
    if (!required)
        return true; // no code configured = open relay
    // Hash both so the comparison takes the same time whatever the input.
    const a = (0, crypto_1.createHash)('sha256').update(given ?? '').digest();
    const b = (0, crypto_1.createHash)('sha256').update(required).digest();
    return (0, crypto_1.timingSafeEqual)(a, b);
}
function strike(client) {
    client.strikes += 1;
    if (client.strikes >= MAX_STRIKES) {
        (0, clients_1.send)(client.socket, 'DISCONNECT', { reason: 'too_many_invalid_packets' });
        client.socket.close(4004, 'invalid');
    }
}
function handleJoin(client, p) {
    if (!codeMatches(p.room_code)) {
        client.locked = true; // ignore everything else from this socket
        // Small delay makes guessing the code slow.
        setTimeout(() => {
            (0, clients_1.send)(client.socket, 'JOIN_ACK', {
                ok: false, server_time: Date.now(), online_count: 0, error: 'invalid_room_code',
            });
            client.socket.close(4003, 'invalid_room_code');
        }, 600);
        return;
    }
    // Duplicate-connection protection: same device joining again replaces the old socket.
    for (const other of clients_1.clients.values()) {
        if (other !== client && other.joined && other.deviceId === p.device_id) {
            other.joined = false;
            (0, clients_1.send)(other.socket, 'DISCONNECT', { reason: 'replaced_by_new_connection' });
            other.socket.close(4000, 'replaced');
        }
    }
    client.deviceId = p.device_id;
    client.name = p.display_name;
    client.joined = true;
    (0, clients_1.send)(client.socket, 'JOIN_ACK', {
        ok: true, server_time: Date.now(), online_count: (0, clients_1.onlineCount)(),
    });
    (0, clients_1.broadcastPresence)(client.socket); // tell the others
    console.log(`+ student joined (${(0, clients_1.onlineCount)()} online)`);
}
function handleConnection(socket) {
    const client = {
        socket, deviceId: null, name: null, joined: false, locked: false,
        alive: true, strikes: 0, sendTimes: [],
    };
    clients_1.clients.set(socket, client);
    // Must JOIN quickly or be dropped.
    const joinTimer = setTimeout(() => {
        if (!client.joined)
            socket.close(4001, 'join_timeout');
    }, JOIN_TIMEOUT_MS);
    socket.on('pong', () => { client.alive = true; });
    socket.on('message', (data, isBinary) => {
        client.alive = true;
        if (client.locked)
            return;
        if (isBinary)
            return strike(client);
        const result = (0, validation_1.parseClientPacket)(data.toString());
        if (!result.ok) {
            if (result.reason === 'bad_version') {
                if (client.joined) {
                    (0, clients_1.send)(socket, 'DISCONNECT', { reason: 'unsupported_version' });
                }
                else {
                    (0, clients_1.send)(socket, 'JOIN_ACK', {
                        ok: false, server_time: Date.now(), online_count: 0,
                        error: `unsupported_version (relay speaks ${protocol_1.PROTOCOL_VERSION})`,
                    });
                }
                socket.close(4002, 'bad_version');
                return;
            }
            return strike(client);
        }
        const packet = result.packet;
        if (!client.joined) {
            if (packet.type === 'JOIN')
                handleJoin(client, packet.payload);
            else
                strike(client); // must JOIN first
            return;
        }
        switch (packet.type) {
            case 'MESSAGE_SEND':
                (0, messageHandler_1.handleMessageSend)(client, packet.payload);
                break;
            case 'HEARTBEAT':
                (0, clients_1.send)(socket, 'HEARTBEAT_ACK', { server_time: Date.now(), online_count: (0, clients_1.onlineCount)() });
                break;
            case 'DISCONNECT':
                socket.close(1000, 'client_leave');
                break;
            default:
                break; // JOIN while already joined: ignored
        }
    });
    socket.on('close', () => {
        clearTimeout(joinTimer);
        clients_1.clients.delete(socket);
        if (client.joined) {
            client.joined = false;
            (0, clients_1.broadcastPresence)();
            console.log(`- student left (${(0, clients_1.onlineCount)()} online)`);
        }
    });
    socket.on('error', () => { });
}
// Every 30 s: ping everyone. No answer by the next round = dead connection, remove it.
function startHeartbeatMonitor() {
    const timer = setInterval(() => {
        for (const c of clients_1.clients.values()) {
            if (!c.alive) {
                c.socket.terminate();
                continue;
            }
            c.alive = false;
            c.socket.ping();
        }
    }, PING_INTERVAL_MS);
    return () => clearInterval(timer);
}
