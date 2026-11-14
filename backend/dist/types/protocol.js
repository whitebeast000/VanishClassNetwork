"use strict";
// AUTO-COPIED from /protocol/protocol.ts. DO NOT EDIT HERE.
// Edit the source file and run: npm run sync-protocol
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEARTBEAT_INTERVAL_MS = exports.MAX_NAME_LENGTH = exports.MAX_TEXT_LENGTH = exports.MAX_QUEUE_AGE_MS = exports.MESSAGE_LIFETIME_MS = exports.PROTOCOL_VERSION = void 0;
exports.makePacket = makePacket;
// VANISH shared protocol, version 1.0
// This is the ONLY place the protocol is defined.
// After editing, run:  npm run sync-protocol
exports.PROTOCOL_VERSION = '1.0';
// Shared limits. Both client and relay read these.
exports.MESSAGE_LIFETIME_MS = 30_000; // visible life, starts at relay delivery
exports.MAX_QUEUE_AGE_MS = 60_000; // max wait while offline
exports.MAX_TEXT_LENGTH = 280;
exports.MAX_NAME_LENGTH = 24;
exports.HEARTBEAT_INTERVAL_MS = 15_000;
function makePacket(type, payload) {
    return { version: exports.PROTOCOL_VERSION, type, payload };
}
