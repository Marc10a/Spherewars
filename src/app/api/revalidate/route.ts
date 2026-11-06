import { revalidatePath, revalidateTag } from "next/cache";
import { WP_TAG } from "@/lib/cms/client";
import { locales } from "@/lib/i18n";
import { revalidatablePath, safeEqual } from "@/lib/cms/secret";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * WordPress calls this after a publish / update / unpublish so the public site refreshes immediately.
 *   POST /api/revalidate    header: x-revalidate-secret: <REVALIDATE_SECRET>    body: { "paths": ["/es/novedades", "/es"] }
 * Without `paths` the home and the news/events listings of every language are refreshed. Only known path shapes are accepted.
 * Every WordPress read is also expired at once (tag "wp"), so the next visitor already gets the new content.
 */
export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return new Response("Not configured", { status: 503 });
  if (!safeEqual(req.headers.get("x-revalidate-secret"), secret)) return new Response("Unauthorized", { status: 401 });

  let paths: unknown[] = [];
  try { paths = ((await req.json()) as { paths?: unknown[] }).paths ?? []; } catch { /* no body: refresh the defaults */ }
  const targets = paths.length
    ? paths
    : locales.flatMap((l) => [`/${l}`, `/${l}/novedades`, `/${l}/eventos`, `/${l}/comunidad`, `/${l}/miniaturas`]);

  revalidateTag(WP_TAG, { expire: 0 });
  const done: string[] = [];
  for (const p of targets) {
    if (!revalidatablePath(p)) continue; // ignore anything unexpected instead of feeding it to the cache
    revalidatePath(p);
    done.push(p);
  }
  return Response.json({ revalidated: done });
}
