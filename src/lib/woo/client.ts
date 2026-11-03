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

async function call<T>(method: "GET" | "POST", path: string, schema: ZodType<T>, o: WcOptions, params: Record<string, string | number | undefined>, body?: unknown): Promise<T | null> {
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
    if (!res.ok) return null;
    const parsed = schema.safeParse(await res.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export const wcGet = <T,>(path: string, schema: ZodType<T>, o: WcOptions, params: Record<string, string | number | undefined> = {}) => call("GET", path, schema, o, params);
export const wcPost = <T,>(path: string, schema: ZodType<T>, o: WcOptions, body: unknown) => call("POST", path, schema, o, {}, body);
