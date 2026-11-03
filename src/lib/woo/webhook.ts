import { createHmac, timingSafeEqual } from "node:crypto";

/** WooCommerce signs every webhook: X-WC-Webhook-Signature = base64(HMAC-SHA256(rawBody, secret)). Constant-time comparison. */
export function verifyWooSignature(rawBody: string, signature: string | null, secret: string | undefined): boolean {
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  const given = Buffer.from(signature, "base64");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
