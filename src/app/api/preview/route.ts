import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { safeEqual } from "@/lib/cms/secret";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = { news: "novedades", event: "eventos" };

/**
 * Draft preview for editors. WordPress "Preview" button -> /api/preview?secret=...&type=news&slug=my-post&locale=es
 * Enables Next.js draft mode (a cookie only this browser gets) and redirects to the page, which then reads the DRAFT from
 * WordPress with the server-side token. Visitors never see drafts. Leave with /api/preview/exit.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!safeEqual(url.searchParams.get("secret"), process.env.PREVIEW_SECRET)) return new Response("Unauthorized", { status: 401 });

  const section = TYPES[url.searchParams.get("type") ?? ""];
  const slug = url.searchParams.get("slug") ?? "";
  const loc = url.searchParams.get("locale") ?? "es";
  if (!section || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !isLocale(loc)) return new Response("Bad request", { status: 400 });

  (await draftMode()).enable();
  redirect(`/${loc}/${section}/${slug}`);
}
