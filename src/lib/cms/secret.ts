import { timingSafeEqual } from "node:crypto";

/** Constant-time secret comparison (avoids leaking the secret through response timing). Empty/missing secrets never match. */
export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Only these path prefixes can be revalidated through the webhook (never arbitrary input into the cache). */
const ALLOWED = [/^\/$/, /^\/(es|en|ca)(\/(novedades|eventos|comunidad|miniaturas|facciones|tienda|wikisphere)(\/[a-z0-9-/]*)?)?$/];
export const revalidatablePath = (p: unknown): p is string => typeof p === "string" && p.length < 200 && ALLOWED.some((r) => r.test(p));
