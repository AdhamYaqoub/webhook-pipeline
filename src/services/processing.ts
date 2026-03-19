import type { Pipeline } from '../models';

export interface ProcessResult {
  processedPayload: unknown;
}

export function processPayload(pipeline: Pipeline, payload: unknown): ProcessResult {
  const cfg = (pipeline.actionConfig ?? {}) as any;

  if (pipeline.actionType === 'echo') {
    return { processedPayload: payload };
  }

  if (pipeline.actionType === 'extract_field') {
    const fieldPath: string = cfg.fieldPath;
    if (!fieldPath || typeof payload !== 'object' || payload === null) {
      return { processedPayload: null };
    }
    const segments = fieldPath.split('.');
    let current: any = payload;
    for (const seg of segments) {
      if (current && typeof current === 'object' && seg in current) {
        current = current[seg];
      } else {
        current = null;
        break;
      }
    }
    return { processedPayload: current };
  }

  if (pipeline.actionType === 'template') {
    const template: string = cfg.template ?? '';
    const context = { payload };
    const rendered = template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_m: string, expr: string) => {
      const trimmed = expr.trim();
      if (trimmed === 'payload') {
        return JSON.stringify(payload);
      }
      if (trimmed.startsWith('payload.')) {
        const path = trimmed.slice('payload.'.length);
        if (typeof payload === 'object' && payload !== null) {
          const segments = path.split('.');
          let current: any = payload;
          for (const seg of segments) {
            if (current && typeof current === 'object' && seg in current) {
              current = current[seg];
            } else {
              current = '';
              break;
            }
          }
          return String(current ?? '');
        }
      }
      if (trimmed in context) {
        return String((context as any)[trimmed]);
      }
      return '';
    });
    return { processedPayload: { text: rendered } };
  }

  return { processedPayload: payload };
}

