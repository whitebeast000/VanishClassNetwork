"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUuid = void 0;
exports.parseClientPacket = parseClientPacket;
const protocol_1 = require("../types/protocol");
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NAME_BAD_CHARS = /[\u0000-\u001f\u007f]/;
const TEXT_BAD_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/; // newline allowed
const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v);
exports.isUuid = isUuid;
const bad = (reason) => ({ ok: false, reason });
function parseClientPacket(raw) {
    let data;
    try {
        data = JSON.parse(raw);
    }
    catch {
        return { ok: false, reason: 'bad_json' };
    }
    if (!isObj(data) || typeof data.type !== 'string' || !isObj(data.payload)) {
        return { ok: false, reason: 'bad_shape' };
    }
    if (data.version !== protocol_1.PROTOCOL_VERSION)
        return { ok: false, reason: 'bad_version' };
    const p = data.payload;
    switch (data.type) {
        case 'JOIN': {
            if (!(0, exports.isUuid)(p.device_id))
                return bad('bad_payload');
            if (typeof p.display_name !== 'string')
                return bad('bad_payload');
            const name = p.display_name.trim();
            if (name.length < 2 || name.length > protocol_1.MAX_NAME_LENGTH || NAME_BAD_CHARS.test(name)) {
                return bad('bad_payload');
            }
            if (p.room_code !== undefined && (typeof p.room_code !== 'string' || p.room_code.length > 64)) {
                return bad('bad_payload');
            }
            return {
                ok: true,
                packet: {
                    version: protocol_1.PROTOCOL_VERSION, type: 'JOIN',
                    payload: { device_id: p.device_id, display_name: name, room_code: p.room_code },
                },
            };
        }
        case 'MESSAGE_SEND': {
            if (!(0, exports.isUuid)(p.id) || !(0, exports.isUuid)(p.device_id))
                return bad('bad_payload');
            if (typeof p.sender !== 'string' || typeof p.text !== 'string')
                return bad('bad_payload');
            const text = p.text.trim();
            if (text.length < 1 || text.length > protocol_1.MAX_TEXT_LENGTH || TEXT_BAD_CHARS.test(text)) {
                return bad('bad_payload');
            }
            if (typeof p.queued_ms !== 'number' || !Number.isFinite(p.queued_ms) || p.queued_ms < 0) {
                return bad('bad_payload');
            }
            return {
                ok: true,
                packet: {
                    version: protocol_1.PROTOCOL_VERSION, type: 'MESSAGE_SEND',
                    payload: { id: p.id, sender: p.sender, device_id: p.device_id, text, queued_ms: p.queued_ms },
                },
            };
        }
        case 'HEARTBEAT': {
            if (typeof p.client_time !== 'number' || !Number.isFinite(p.client_time))
                return bad('bad_payload');
            return { ok: true, packet: { version: protocol_1.PROTOCOL_VERSION, type: 'HEARTBEAT', payload: { client_time: p.client_time } } };
        }
        case 'DISCONNECT': {
            const reason = typeof p.reason === 'string' ? p.reason.slice(0, 100) : undefined;
            return { ok: true, packet: { version: protocol_1.PROTOCOL_VERSION, type: 'DISCONNECT', payload: { reason } } };
        }
        default:
            return { ok: false, reason: 'bad_type' };
    }
}
