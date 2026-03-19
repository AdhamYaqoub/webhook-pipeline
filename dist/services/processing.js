"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processPayload = processPayload;
function processPayload(pipeline, payload) {
    const cfg = (pipeline.actionConfig ?? {});
    if (pipeline.actionType === 'echo') {
        return { processedPayload: payload };
    }
    if (pipeline.actionType === 'extract_field') {
        const fieldPath = cfg.fieldPath;
        if (!fieldPath || typeof payload !== 'object' || payload === null) {
            return { processedPayload: null };
        }
        const segments = fieldPath.split('.');
        let current = payload;
        for (const seg of segments) {
            if (current && typeof current === 'object' && seg in current) {
                current = current[seg];
            }
            else {
                current = null;
                break;
            }
        }
        return { processedPayload: current };
    }
    if (pipeline.actionType === 'template') {
        const template = cfg.template ?? '';
        const context = { payload };
        const rendered = template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_m, expr) => {
            const trimmed = expr.trim();
            if (trimmed === 'payload') {
                return JSON.stringify(payload);
            }
            if (trimmed.startsWith('payload.')) {
                const path = trimmed.slice('payload.'.length);
                if (typeof payload === 'object' && payload !== null) {
                    const segments = path.split('.');
                    let current = payload;
                    for (const seg of segments) {
                        if (current && typeof current === 'object' && seg in current) {
                            current = current[seg];
                        }
                        else {
                            current = '';
                            break;
                        }
                    }
                    return String(current ?? '');
                }
            }
            if (trimmed in context) {
                return String(context[trimmed]);
            }
            return '';
        });
        return { processedPayload: { text: rendered } };
    }
    return { processedPayload: payload };
}
