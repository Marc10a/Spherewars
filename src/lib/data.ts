import { isConfigured, supabaseServer } from "@/lib/supabase/server";
import { supabasePublic } from "@/lib/supabase/public";
import { wpEvent, wpEvents, wpNews, wpNewsItem } from "@/lib/cms";
import { dict, type Locale } from "@/lib/i18n";
import { searchWiki } from "@/lib/wiki";
import { staticProducts } from "@/lib/shop/static";
import { wooEnabled, wooProducts } from "@/lib/woo";

// Public read layer. RLS already restricts anonymous reads to status = 'published';
// the explicit filters below keep intent visible and handle embargoes. Returns [] when Supabase is not configured.

export type Product = {
  regular_price_cents?: number | null; sale_price_cents?: number | null;
  id: string; slug: string; name: string; category: string; description: { text?: string } | null; contents: string | null;
  price_cents: number | null; currency: string | null; commercial_status: string; buy_url: string | null; profile_url: string | null;
  stock: number | null; sellable: boolean; wiki_slug: string | null; image_path: string | null; image_alt: string | null; factions: { slug: string } | null;
  images?: { src: string; alt: string }[]; // absolute photo URLs (WooCommerce gallery)
};
export type Article = {
  id: string; slug: string; locale: Locale; title: string; body: { md?: string } | null; updated_at: string;
  article_categories: { slug: string; name: Record<string, string> } | null;
};
export type Category = { slug: string; name: Record<string, string> };

const productSelect = "id, slug, name, category, description, contents, price_cents, currency, commercial_status, buy_url, profile_url, stock, sellable, wiki_slug, image_path, image_alt, factions(slug)";

export function mediaUrl(path: string | null) {
  return path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${path}` : null;
}

export async function listProducts(opts: { faction?: string; category?: string } = {}): Promise<Product[]> {
  if (!isConfigured()) return [];
  const sb = await supabaseServer();
  let q = sb.from("products")
    .select(opts.faction ? productSelect.replace("factions(slug)", "factions!inner(slug)") : productSelect)
    .eq("status", "published")
    .or(`publish_at.is.null,publish_at.lte.${new Date().toISOString()}`)
    .order("name");
  if (opts.faction) q = q.eq("factions.slug", opts.faction);
  if (opts.category) q = q.eq("category", opts.category);
  const { data } = await q;
  return (data ?? []) as unknown as Product[];
}

/** Products on sale in the shop: published, flagged sellable, with a price set by the owner. */
export async function listSellableProducts(opts: { faction?: string; category?: string } = {}): Promise<Product[]> {
  if (wooEnabled()) { // WooCommerce is the catalogue: if it is unreachable the shop lists nothing rather than stale data
    const all = (await wooProducts()) ?? [];
    return all.filter((p) => p.sellable && (!opts.faction || p.factions?.slug === opts.faction));
  }
  // No WooCommerce and no database yet: the owner's own price list (prices.json) is the catalogue.
  const all = isConfigured() ? await listProducts(opts) : staticProducts().filter((p) => !opts.faction || p.factions?.slug === opts.faction);
  return all.filter((p) => p.sellable && p.price_cents != null && p.price_cents > 0);
}

export async function getProduct(slug: string): Promise<Product | null> {
  if (!isConfigured()) return null;
  const sb = await supabaseServer();
  const { data } = await sb.from("products").select(productSelect).eq("slug", slug).eq("status", "published")
    .or(`publish_at.is.null,publish_at.lte.${new Date().toISOString()}`).maybeSingle();
  return (data as unknown as Product) ?? null;
}

export async function listCategories(): Promise<Category[]> {
  if (!isConfigured()) return [];
  const sb = await supabaseServer();
  const { data } = await sb.from("article_categories").select("slug, name").order("slug");
  return (data ?? []) as Category[];
}

export async function listArticles(locale: Locale, opts: { category?: string; q?: string } = {}): Promise<Article[]> {
  if (!isConfigured()) return [];
  const sb = await supabaseServer();
  let q = sb.from("articles")
    .select("id, slug, locale, title, body, updated_at, article_categories" + (opts.category ? "!inner" : "") + "(slug, name)")
    .eq("locale", locale).eq("status", "published").order("title");
  if (opts.category) q = q.eq("article_categories.slug", opts.category);
  if (opts.q) q = q.ilike("title", `%${opts.q.replace(/[%_,()]/g, " ").trim()}%`);
  const { data } = await q;
  return (data ?? []) as unknown as Article[];
}

export async function getArticle(locale: Locale, slug: string): Promise<Article | null> {
  if (!isConfigured()) return null;
  const sb = await supabaseServer();
  const { data } = await sb.from("articles")
    .select("id, slug, locale, title, body, updated_at, article_categories(slug, name)")
    .eq("locale", locale).eq("slug", slug).eq("status", "published").maybeSingle();
  return (data as unknown as Article) ?? null;
}

export type NewsRow = {
  id: string; slug: string; category: string; title: string; body: { md?: string; html?: string } | null; publish_at: string | null;
  excerpt?: string; image?: { url: string; alt: string } | null; seo?: { title: string | null; description: string | null };
};

/** Published news for a language, newest first. Returns [] when Supabase is not configured. */
export async function listNews(locale: Locale, limit = 20): Promise<NewsRow[]> {
  const wp = await wpNews(locale, limit); // WordPress (headless) first when configured; null on any failure -> fall back
  if (wp) return wp as NewsRow[];
  if (!isConfigured()) return [];
  const sb = supabasePublic();
  const { data } = await sb.from("news").select("id, slug, category, title, body, publish_at")
    .eq("locale", locale).eq("status", "published")
    .or(`publish_at.is.null,publish_at.lte.${new Date().toISOString()}`)
    .order("publish_at", { ascending: false, nullsFirst: false }).limit(limit);
  return (data ?? []) as NewsRow[];
}

export async function getNews(locale: Locale, slug: string): Promise<NewsRow | null> {
  const wp = await wpNewsItem(locale, slug);
  if (wp) return wp as NewsRow;
  if (!isConfigured()) return null;
  const sb = supabasePublic();
  const { data } = await sb.from("news").select("id, slug, category, title, body, publish_at")
    .eq("locale", locale).eq("slug", slug).eq("status", "published")
    .or(`publish_at.is.null,publish_at.lte.${new Date().toISOString()}`).maybeSingle();
  return (data as NewsRow) ?? null;
}

export type EventRow = {
  id: string; slug: string; kind: string; title: string; starts_at: string; ends_at: string | null; organizer: string | null;
  city: string | null; address: string | null; format: string | null; requirements: string | null; description: string | null;
  prizes: string | null; fee_cents: number | null; capacity: number | null; registration_url: string | null; registration_open: boolean;
};
export const eventKinds: Record<string, string> = {
  demo: "Demostración", tournament: "Torneo", special: "Evento especial", community: "Encuentro de comunidad", fair: "Feria",
};
const eventSelect = "id, slug, kind, title, starts_at, ends_at, organizer, city, address, format, requirements, description, prizes, fee_cents, capacity, registration_url, registration_open";

export async function listEvents(opts: { past?: boolean; city?: string; kind?: string } = {}): Promise<EventRow[]> {
  const wp = await wpEvents({ past: opts.past, limit: 50 });
  if (wp) return (wp as EventRow[]).filter((e) => (!opts.city || e.city === opts.city) && (!opts.kind || e.kind === opts.kind));
  if (!isConfigured()) return [];
  const sb = supabasePublic();
  const now = new Date().toISOString();
  let q = sb.from("events").select(eventSelect).eq("status", "published");
  q = opts.past ? q.lt("starts_at", now).order("starts_at", { ascending: false }).limit(50) : q.gte("starts_at", now).order("starts_at");
  if (opts.city) q = q.eq("city", opts.city);
  if (opts.kind) q = q.eq("kind", opts.kind);
  const { data } = await q;
  return (data ?? []) as EventRow[];
}

export async function getEvent(slug: string): Promise<EventRow | null> {
  const wp = await wpEvent(slug);
  if (wp) return wp as EventRow;
  if (!isConfigured()) return null;
  const sb = await supabaseServer();
  const { data } = await sb.from("events").select(eventSelect).eq("slug", slug).eq("status", "published").maybeSingle();
  return (data as EventRow) ?? null;
}

export const isUpcoming = (iso: string) => new Date(iso).getTime() > Date.now();

export async function registrationCount(eventId: string): Promise<number> {
  const sb = await supabaseServer();
  const { data } = await sb.rpc("event_registration_count", { p_event: eventId });
  return (data as number) ?? 0;
}

export type Download = {
  id: string; category: string; name: string; description: string | null; version: string | null; locale: string | null;
  file_type: string | null; size_bytes: number | null; storage_path: string; updated_at: string;
};
export const downloadCategories: Record<string, string> = {
  rules: "Reglamento de tercera edición", profiles: "Perfiles", reference: "Hojas de referencia", extra: "Material complementario",
  updates: "Actualizaciones", faq: "FAQs", errata: "Erratas", events: "Material para eventos",
};

export async function listDownloads(): Promise<Download[]> {
  if (!isConfigured()) return [];
  const sb = await supabaseServer();
  const { data } = await sb.from("downloadable_resources")
    .select("id, category, name, description, version, locale, file_type, size_bytes, storage_path, updated_at")
    .eq("status", "published").order("category").order("name");
  return (data ?? []) as Download[];
}

export const formatBytes = (n: number | null) =>
  n == null ? "" : n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

export type SearchHit = { type: "wiki" | "minis" | "events" | "resources"; title: string; href: string; detail?: string };

/** Global search over published content. Title/name match only (no full-text index yet). */
export async function searchAll(locale: Locale, raw: string): Promise<SearchHit[]> {
  const term = raw.replace(/[%_,()\\]/g, " ").trim().slice(0, 80);
  if (term.length < 2) return [];
  const wikiHits: SearchHit[] = searchWiki(term).slice(0, 40).map((p) => ({ type: "wiki", title: p.title, href: `/${locale}/wikisphere/${p.slug}`, detail: dict[locale].wiki.cat[p.category] ?? p.categoryName }));
  if (!isConfigured()) return wikiHits;
  const sb = await supabaseServer();
  const like = `%${term}%`;
  const nowIso = new Date().toISOString();
  const [a, p, e, d] = await Promise.all([
    sb.from("articles").select("slug, title").eq("locale", locale).eq("status", "published").ilike("title", like).limit(20),
    sb.from("products").select("slug, name").eq("status", "published").or(`publish_at.is.null,publish_at.lte.${nowIso}`).ilike("name", like).limit(20),
    sb.from("events").select("slug, title, city, starts_at").eq("status", "published").ilike("title", like).limit(20),
    sb.from("downloadable_resources").select("name, category, storage_path").eq("status", "published").ilike("name", like).limit(20),
  ]);
  return [
    ...wikiHits,
    ...(a.data ?? []).map((r) => ({ type: "wiki" as const, title: r.title, href: `/${locale}/wikisphere/${r.slug}` })),
    ...(p.data ?? []).map((r) => ({ type: "minis" as const, title: r.name, href: `/${locale}/miniaturas/${r.slug}` })),
    ...(e.data ?? []).map((r) => ({ type: "events" as const, title: r.title, href: `/${locale}/eventos/${r.slug}`, detail: [r.city, new Date(r.starts_at).toLocaleDateString(locale)].filter(Boolean).join(" · ") })),
    ...(d.data ?? []).map((r) => ({ type: "resources" as const, title: r.name, href: `/${locale}/descargas`, detail: dict[locale].downloads.categories[r.category] ?? downloadCategories[r.category] })),
  ];
}

export const formatPrice = (cents: number | null, currency: string | null, locale = "es") =>
  cents == null ? null : new Intl.NumberFormat(locale, { style: "currency", currency: currency ?? "EUR" }).format(cents / 100);
