"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EdgeConfigSessionStore = void 0;
const express_session_1 = require("express-session");
const edge_config_1 = require("@vercel/edge-config");
class EdgeConfigSessionStore extends express_session_1.Store {
    constructor(options = {}) {
        super();
        this.prefix = options.prefix || 'sess:';
        this.ttl = options.ttl || 7 * 24 * 60 * 60; // default 7 days
    }
    key(sid) {
        return `${this.prefix}${sid}`;
    }
    async get(sid, callback) {
        try {
            const data = await (0, edge_config_1.get)(this.key(sid));
            if (!data)
                return callback(null, undefined);
            callback(null, JSON.parse(data));
        }
        catch (err) {
            callback(err);
        }
    }
    async set(sid, session, callback) {
        try {
            await (0, edge_config_1.set)(this.key(sid), JSON.stringify(session), { expiration: this.ttl });
            callback && callback();
        }
        catch (err) {
            callback && callback(err);
        }
    }
    async destroy(sid, callback) {
        try {
            await (0, edge_config_1.del)(this.key(sid));
            callback && callback();
        }
        catch (err) {
            callback && callback(err);
        }
    }
}
exports.EdgeConfigSessionStore = EdgeConfigSessionStore;
//# sourceMappingURL=edgeConfigSessionStore.js.map