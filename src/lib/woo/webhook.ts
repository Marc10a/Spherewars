import { createHmac, timingSafeEqual } from "node:crypto";

/** WooCommerce signs every webhook: X-WC-Webhook-Signature = base64(HMAC-SHA256(rawBody, secret)). Constant-time comparison. */
export function verifyWooSignature(rawBody: string, signature: string | null, secret: string | undefined): boolean {
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  const given = Buffer.from(signature, "base64");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * When a webhook is saved, WooCommerce tests the URL with an UNSIGNED POST whose whole body is `webhook_id=<id>` and needs any 2xx
 * (WC_Webhook::deliver_ping). Only that exact shape, with no signature header at all, counts as a ping. A ping must have no side
 * effects: anyone can send one, and real events still need a valid signature.
 */
export const isWooPing = (rawBody: string, signature: string | null) => signature === null && /^webhook_id=\d{1,20}$/.test(rawBody);
