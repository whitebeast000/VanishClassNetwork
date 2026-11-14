"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startExpirationService = startExpirationService;
const clients_1 = require("../socket/clients");
const messageService_1 = require("./messageService");
// Every 500 ms: find messages whose expires_at has passed and tell everyone.
function startExpirationService() {
    const timer = setInterval(() => {
        for (const id of (0, messageService_1.sweep)(Date.now())) {
            (0, clients_1.broadcast)('MESSAGE_EXPIRED', { message_id: id });
        }
    }, 500);
    return () => clearInterval(timer);
}
