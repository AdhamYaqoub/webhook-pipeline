export default function enrich(payload: any) {
  return { ...payload, enrichedAt: new Date().toISOString() };
}