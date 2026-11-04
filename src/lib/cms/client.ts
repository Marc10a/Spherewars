// Minimal WordPress client (no framework imports, so it can be unit tested). Every call has a timeout and returns
// validated data or `null`: callers fall back to the static content, so a WordPress outage never breaks the public site.
import type { ZodType } from "zod";

export type WpOptions = {
  baseUrl: string;                 // e.g. https://tienda.spherewars.com
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  previewToken?: string | null;    // only for draft previews; sent as a Bearer token, never exposed to the browser
  revalidate?: number | false;     // ISR hint passed to fetch (seconds); false = no cache
};

export function wpUrl(baseUrl: string, path: string, params: Record<string, string | number | undefined> = {}) {
  const u = new URL(`/wp-json/sphere/v1/${path.replace(/^\/+/, "")}`, baseUrl.replace(/\/+$/, "") + "/");
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") u.searchParams.set(k, String(v));
  return u.toString();
}

export async function wpGet<T>(path: string, schema: ZodType<T>, opts: WpOptions, params: Record<string, string | number | undefined> = {}): Promise<T | null> {
  const f = opts.fetchImpl ?? fetch;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 4000);
  try {
    const res = await f(wpUrl(opts.baseUrl, path, params), {
      signal: ctrl.signal,
      headers: { Accept: "application/json", ...(opts.previewToken ? { Authorization: `Bearer ${opts.previewToken}` } : {}) },
      ...(opts.previewToken ? { cache: "no-store" as const } : opts.revalidate === false ? { cache: "no-store" as const } : { next: { revalidate: opts.revalidate ?? 300 } }),
    } as RequestInit);
    if (!res.ok) return null;
    const parsed = schema.safeParse(await res.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null; // network error, timeout, invalid JSON
  } finally {
    clearTimeout(timer);
  }
}
