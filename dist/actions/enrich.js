"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = enrich;
function enrich(payload) {
    return { ...payload, enrichedAt: new Date().toISOString() };
}
