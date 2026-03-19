export default function filter(payload: any) {
  if (payload?.active) return payload;
  return null;
}