// Minimal WooCommerce REST client (no framework imports, unit tested). SERVER ONLY: it carries the consumer key/secret.
// Every call has a timeout and returns validated data or null; the shop never breaks because WooCommerce is slow or down.
import type { ZodType } from "zod";

export type WcOptions = {
  baseUrl: string;            // e.g. https://cms.spherewars.es
  key: string; secret: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  revalidate?: number | false;
};

export function wcUrl(baseUrl: string, path: string, params: Record<string, string | number | undefined> = {}) {
  const u = new URL(`/wp-json/wc/v3/${path.replace(/^\/+/, "")}`, baseUrl.replace(/\/+$/, "") + "/");
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") u.searchParams.set(k, String(v));
  return u.toString();
}

const auth = (o: WcOptions) => `Basic ${Buffer.from(`${o.key}:${o.secret}`).toString("base64")}`;

/**
 * Result of a write. `ambiguous` = we cannot know whether WooCommerce applied it (timeout, connection lost, 5xx, unreadable reply):
 * retrying blindly could duplicate it. A clear 4xx rejection is not ambiguous.
 */
export type WcWrite<T> = { ok: true; data: T } | { ok: false; ambiguous: boolean };

async function send<T>(method: "GET" | "POST", path: string, schema: ZodType<T>, o: WcOptions, params: Record<string, string | number | undefined>, body?: unknown): Promise<WcWrite<T>> {
  const f = o.fetchImpl ?? fetch;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), o.timeoutMs ?? 5000);
  try {
    const res = await f(wcUrl(o.baseUrl, path, params), {
      method, signal: ctrl.signal,
      headers: { Accept: "application/json", Authorization: auth(o), ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      ...(method === "POST" || o.revalidate === false ? { cache: "no-store" as const } : { next: { revalidate: o.revalidate ?? 300, tags: ["woo"] } }),
    } as RequestInit);
    if (!res.ok) return { ok: false, ambiguous: res.status >= 500 };
    const parsed = schema.safeParse(await res.json());
    return parsed.success ? { ok: true, data: parsed.data } : { ok: false, ambiguous: true };
  } catch {
    return { ok: false, ambiguous: true };
  } finally {
    clearTimeout(timer);
  }
}

const orNull = <T,>(r: WcWrite<T>) => (r.ok ? r.data : null);

export const wcGet = async <T,>(path: string, schema: ZodType<T>, o: WcOptions, params: Record<string, string | number | undefined> = {}) => orNull(await send("GET", path, schema, o, params));
export const wcPost = async <T,>(path: string, schema: ZodType<T>, o: WcOptions, body: unknown) => orNull(await send("POST", path, schema, o, {}, body));
/** Like wcPost, but tells a clear rejection from an unknown outcome, for writes that must not be repeated blindly (orders). */
export const wcWrite = <T,>(path: string, schema: ZodType<T>, o: WcOptions, body: unknown) => send("POST", path, schema, o, {}, body);
