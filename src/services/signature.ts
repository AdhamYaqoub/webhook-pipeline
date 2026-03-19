import { createHmac, timingSafeEqual } from 'crypto';

export function normalizeSignatureHeader(signatureHeader: string | undefined): string | null {
  if (!signatureHeader) return null;
  // Common conventions: "sha256=..." or raw hex
  const parts = signatureHeader.split('=');
  if (parts.length === 2 && parts[0].toLowerCase() === 'sha256') {
    return parts[1];
  }
  return signatureHeader;
}

export function verifyHmacSha256Signature(
  secret: string,
  rawBody: Buffer | string,
  signatureHeader?: string,
): boolean {
  const signature = normalizeSignatureHeader(signatureHeader);
  if (!signature) return false;

  let computed: string;
  try {
    computed = createHmac('sha256', secret).update(rawBody).digest('hex');
  } catch {
    return false;
  }

  // Compare in constant time
  try {
    const sigBuffer = Buffer.from(signature, 'hex');
    const compBuffer = Buffer.from(computed, 'hex');
    if (sigBuffer.length !== compBuffer.length) return false;
    return timingSafeEqual(sigBuffer, compBuffer);
  } catch {
    return false;
  }
}
