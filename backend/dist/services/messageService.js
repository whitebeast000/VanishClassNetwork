"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAck = getAck;
exports.accept = accept;
exports.reject = reject;
exports.sweep = sweep;
const protocol_1 = require("../types/protocol");
// How long an ID is remembered AFTER expiry, so a late duplicate is still ignored.
const DEDUPE_GRACE_MS = 120_000;
// NOTE: message TEXT is never stored here. Only the ID and timestamps.
const store = new Map();
function getAck(id) {
    return store.get(id)?.ack;
}
function accept(m) {
    const sentAt = Date.now(); // THE authoritative time
    const expiresAt = sentAt + protocol_1.MESSAGE_LIFETIME_MS; // sent_at + 30 s
    const ack = {
        message_id: m.id, status: 'DELIVERED', sent_at: sentAt, expires_at: expiresAt,
    };
    store.set(m.id, { ack, expiresAt, announced: false, forgetAt: expiresAt + DEDUPE_GRACE_MS });
    return {
        ack,
        deliver: {
            id: m.id, sender: m.sender, device_id: m.device_id, text: m.text,
            sent_at: sentAt, expires_at: expiresAt,
        },
    };
}
function reject(id, reason) {
    const ack = {
        message_id: id, status: 'DROPPED', sent_at: null, expires_at: null, reason,
    };
    store.set(id, { ack, expiresAt: null, announced: true, forgetAt: Date.now() + DEDUPE_GRACE_MS });
    return ack;
}
// Returns IDs that just expired. Also forgets old IDs.
function sweep(now) {
    const expired = [];
    for (const [id, m] of store) {
        if (m.expiresAt !== null && !m.announced && now >= m.expiresAt) {
            m.announced = true;
            expired.push(id);
        }
        if (now >= m.forgetAt)
            store.delete(id);
    }
    return expired;
}
