"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleMessageSend = handleMessageSend;
const messageService_1 = require("../services/messageService");
const protocol_1 = require("../types/protocol");
const clients_1 = require("./clients");
const RATE_WINDOW_MS = 10_000;
const RATE_MAX = 10; // max messages per student per 10 s
function handleMessageSend(client, p) {
    // 1. A student may only send as themselves.
    if (p.device_id !== client.deviceId)
        return;
    // 2. Duplicate ID: repeat the original answer, forward nothing.
    const previous = (0, messageService_1.getAck)(p.id);
    if (previous) {
        (0, clients_1.send)(client.socket, 'DELIVERY_ACK', previous);
        return;
    }
    // 3. Spam protection.
    const now = Date.now();
    client.sendTimes = client.sendTimes.filter(t => now - t < RATE_WINDOW_MS);
    if (client.sendTimes.length >= RATE_MAX) {
        (0, clients_1.send)(client.socket, 'DELIVERY_ACK', (0, messageService_1.reject)(p.id, 'rate_limited'));
        return;
    }
    // 4. Waited offline too long on the phone: never deliver.
    if (p.queued_ms > protocol_1.MAX_QUEUE_AGE_MS) {
        (0, clients_1.send)(client.socket, 'DELIVERY_ACK', (0, messageService_1.reject)(p.id, 'queue_age_exceeded'));
        return;
    }
    // 5. Accept. The relay sets sent_at and expires_at here.
    client.sendTimes.push(now);
    const { ack, deliver } = (0, messageService_1.accept)({
        id: p.id,
        sender: client.name, // trusted name from JOIN, not from the packet
        device_id: p.device_id,
        text: p.text,
    });
    (0, clients_1.send)(client.socket, 'DELIVERY_ACK', ack);
    (0, clients_1.broadcast)('MESSAGE_DELIVER', deliver, client.socket); // everyone except the sender
}
