"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = filter;
function filter(payload) {
    if (payload?.active)
        return payload;
    return null;
}
