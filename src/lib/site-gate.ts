/**
 * Temporary password on the whole web while it is being reviewed in production.
 * In production it fails closed: without SITE_ACCESS_PASSWORD the web stays shut. To launch, set SITE_ACCESS_OPEN=1 and redeploy.
 * Webhooks and static files don't pass through here; see the matcher in src/proxy.ts.
 */
export type GateResult = "off" | "allowed" | "ask" | "locked";

export const gateActive = (env: Record<string, string | undefined> = process.env) =>
  env.SITE_ACCESS_OPEN !== "1" && (Boolean(env.SITE_ACCESS_PASSWORD) || env.VERCEL_ENV === "production");

function sameText(a: string, b: string) {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export function checkGate(authorization: string | null, env: Record<string, string | undefined> = process.env): GateResult {
  if (!gateActive(env)) return "off";
  const password = env.SITE_ACCESS_PASSWORD;
  if (!password) return "locked";
  if (!authorization?.startsWith("Basic ")) return "ask";
  let decoded = "";
  try { decoded = new TextDecoder().decode(Uint8Array.from(atob(authorization.slice(6)), (c) => c.charCodeAt(0))); } catch { return "ask"; }
  return sameText(decoded.slice(decoded.indexOf(":") + 1), password) ? "allowed" : "ask";
}
