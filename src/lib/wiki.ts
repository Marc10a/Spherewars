import raw from "@/content/wiki.json";
import photoMap from "@/content/mini-photos.json";
import mainOverride from "@/content/mini-main.json";
import art from "@/content/character-art.json";
import shopPhotos from "@/content/shop-photos.json";
import shopDocs from "@/content/shop-products.json";

// Official wiki snapshot (see scripts/sync-wiki.mjs). HTML was sanitized with an allow-list at sync time.
export type WikiPage = {
  path: string; slug: string; category: string; categoryName: string; title: string; description: string;
  updatedAt: string; html: string; image: string | null;
};

const data = raw as { source: string; syncedAt: string; pages: WikiPage[] };

export const wikiSource = data.source;
export const wikiSyncedAt = data.syncedAt;
export const wikiPages = data.pages;

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").toLowerCase();
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const index = new Map(data.pages.map((p) => [p.slug, p]));
const haystack = new Map(data.pages.map((p) => [p.slug, norm(`${p.title} ${p.description} ${text(p.html)}`)]));

export const getWikiPage = (slug: string) => index.get(slug) ?? null;

// Section pages repeat titles across peoples ("Aspecto físico"…): their meta title names the people they belong to.
const titleUses = new Map<string, number>();
for (const p of data.pages) titleUses.set(p.title.toLowerCase(), (titleUses.get(p.title.toLowerCase()) ?? 0) + 1);
function parentTitle(p: WikiPage) {
  const segs = p.slug.split("/");
  for (let i = segs.length - 1; i > 0; i--) {
    const pre = segs.slice(0, i).join("/");
    const parent = index.get(pre) ?? index.get(`${pre}/${segs[i - 1]}-faccion`);
    if (parent) return parent.title.replace(/\s+Facción$/, "");
  }
  return null;
}
/** Title for <title>/OG: the page title, plus its parent page when another article has the same title. */
export function wikiMetaTitle(p: WikiPage) {
  const parent = (titleUses.get(p.title.toLowerCase()) ?? 0) > 1 ? parentTitle(p) : null;
  return parent ? `${p.title} · ${parent}` : p.title;
}

export const wikiCategories = (() => {
  const map = new Map<string, { slug: string; name: string; count: number }>();
  for (const p of data.pages) {
    const c = map.get(p.category) ?? { slug: p.category, name: p.categoryName, count: 0 };
    c.count++;
    map.set(p.category, c);
  }
  const order = ["home", "historia", "cronologia", "dioses", "lugares", "quinta-esencia", "facciones", "personajes"];
  return [...map.values()].sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug));
})();

export function searchWiki(q?: string, category?: string) {
  const term = q ? norm(q.trim()) : "";
  return data.pages.filter((p) => (!category || p.category === category) && (!term || haystack.get(p.slug)!.includes(term)));
}

/** Faction -> folder of its characters in the wiki (note: the wiki folder for Urueh is spelled "mandas"). */
const characterFolder: Record<string, string> = {
  "adeptos-de-malesur": "personajes/adeptos-de-malesur/",
  "manadas-de-urueh": "personajes/mandas-de-urueh/",
  "vastagos-de-kurgan": "personajes/vastagos-de-kurgan/",
  alianza: "personajes/alianza/",
};
export const factionCharacters = (factionSlug: string) => {
  const prefix = characterFolder[factionSlug];
  return prefix ? data.pages.filter((p) => p.slug.startsWith(prefix)) : [];
};
export const pageImages = (p: WikiPage) => [...p.html.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1]);
/** Best photo of a character: the miniature render if there is one, else concept art, else none. */
export const miniImage = (p: WikiPage) => {
  const imgs = pageImages(p);
  return imgs.find((s) => /mini/i.test(s)) ?? imgs[0] ?? null;
};
/** The product (price list / description / photos) a wiki page belongs to: itself, or the shared one (the Cohort of Postulants). */
export const shopKey = (slug: string) => (shopDocs.aliases as Record<string, string>)[slug] ?? slug;
type Shot = { src: string; kind: string };
export const ownerPhotos = (slug: string): { tile: string; gallery: Shot[] } | null =>
  (shopPhotos.photos as Record<string, { tile: string; gallery: Shot[] }>)[shopKey(slug)] ?? null;

/** All photos of a miniature for its product gallery: the main visual first, then the rest of the wiki page's images (no duplicates). */
export const miniPhotos = (p: WikiPage): { src: string; kind: "photo" | "illustration" }[] => {
  const mine = ownerPhotos(p.slug);
  const main = miniVisual(p);
  const out: { src: string; kind: "photo" | "illustration" }[] = mine ? mine.gallery.map((g) => ({ src: g.src, kind: "photo" as const })) : main ? [main] : [];
  for (const src of pageImages(p)) if (!out.some((o) => o.src === src)) out.push({ src, kind: /mini/i.test(src) ? "photo" : "illustration" });
  return out;
};
export type MiniVisual = { src: string; kind: "photo" | "illustration" } | null;
/**
 * The image of a miniature, honestly labelled:
 *  1) the owner's own photo (fotos-miniaturas/, kind "photo") always wins;
 *  2) the image on the wiki page (a "mini" render counts as a photo, anything else as an illustration);
 *  3) an official illustration from the wiki asset library (scripts/mini-photo-sources.json).
 * null = no image yet: the card shows a "provisional image" placeholder.
 */
/** Lore side of the site: the character's official illustration. Miniature photos belong to the shop only. */
export const characterArt = (slug: string): { src: string; bg: "transparent" | "light" | "dark"; w: number; h: number } | null =>
  (art as Record<string, { src: string; bg: "transparent" | "light" | "dark"; w: number; h: number }>)[slug] ?? null;

export function miniVisual(p: WikiPage): MiniVisual {
  const mine = ownerPhotos(p.slug);
  if (mine) return { src: mine.tile, kind: "photo" };
  const chosen = (mainOverride.main as Record<string, string>)[p.slug];
  if (chosen) return { src: chosen, kind: "illustration" };
  const extra = (photoMap as Record<string, { src: string; kind: "photo" | "illustration" }>)[p.slug];
  if (extra?.kind === "photo") return extra;
  const own = miniImage(p);
  if (own) return { src: own, kind: /mini/i.test(own) ? "photo" : "illustration" };
  return extra ?? null;
}

export const factionSubpages = (factionSlug: string) => {
  const prefix = `facciones/${factionSlug}/`;
  return data.pages.filter((p) => p.slug.startsWith(prefix));
};
const entity = (s: string) => s.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const strip = (h: string) => entity(h.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

/** Cuts at the last sentence end before `max` characters (falls back to a word boundary). */
function briefOf(text: string, max = 230) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  if (end > 90) return cut.slice(0, end + 1);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:]$/, "") + "…";
}

export type CharacterInfo = { race: string | null; affiliation: string | null; excerpt: string };

/** Official data of a character page: race and affiliation from its info table, plus a short excerpt of the story. */
export function characterInfo(p: WikiPage): CharacterInfo {
  const rows = new Map([...p.html.matchAll(/<tr>\s*<td>([^<]*)<\/td>\s*<td>([^<]*)<\/td>/g)].map((m) => [strip(m[1]), strip(m[2])]));
  const paras = [...p.html.matchAll(/<(p|blockquote)>([\s\S]*?)<\/\1>/g)].map((m) => strip(m[2])).filter((t) => t.length > 60);
  return { race: rows.get("Raza") ?? null, affiliation: rows.get("Afiliación") ?? null, excerpt: briefOf(paras[0] ?? p.description ?? "") };
}

export const factionWikiPage = (factionSlug: string) => getWikiPage(`facciones/${factionSlug}`);

const plain = (h: string) => h.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();

/** Adds anchor ids to h2/h3, gives empty-alt images a text alternative, and returns the table of contents. */
/** Photos of the miniatures belong to the shop: articles keep only illustrations. */
const withoutMiniPhotos = (html: string) =>
  html
    .replace(/<h2>(?:<span>¶<\/span> )?Miniaturas<\/h2>\s*(?:<p>\s*(?:<img [^>]*>\s*)+<\/p>\s*)*/g, "")
    .replace(/<img [^>]*src="[^"]*-mini(?:atura)?(?:-v\d+)?\.webp"[^>]*>/g, "")
    .replace(/<p>\s*<\/p>/g, "");

/** Illustration of a wiki page for cards and sharing; never a photo of the miniature. */
export const loreImage = (p: WikiPage) => characterArt(p.slug)?.src ?? pageImages(p).find((s) => !/mini/i.test(s)) ?? null;

export function prepareArticle(p: WikiPage, locale: string) {
  const toc: { id: string; text: string; level: 2 | 3 }[] = [];
  const used = new Set<string>();
  let html = withoutMiniPhotos(p.html).replaceAll("/__LOCALE__/", `/${locale}/`).replaceAll("<span>¶</span> ", "").replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_m, lvl: string, inner: string) => {
    const text = plain(inner);
    let id = norm(text).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "seccion";
    while (used.has(id)) id += "-2";
    used.add(id);
    toc.push({ id, text, level: Number(lvl) as 2 | 3 });
    return `<h${lvl} id="${id}">${inner}</h${lvl}>`;
  });
  html = html.replace(/<img src="([^"]+)" alt="" ?\/?>/g, (_m, src: string) => `<img src="${src}" alt="${p.title.replace(/"/g, "&quot;")}" loading="lazy" decoding="async">`);
  // The first image, when it comes before the second section, is usually the article's largest paint above the fold: load it at once.
  const first = html.search(/<img\b/);
  if (first >= 0 && (html.slice(0, first).match(/<h[23]\b/g) ?? []).length <= 1) {
    html = html.slice(0, first) + html.slice(first).replace(/^<img\b([^>]*?)\s+loading="lazy"/, '<img$1 fetchpriority="high"');
  }
  return { html, toc };
}

/** Other pages of the same family (same top two path segments), then same category. */
export function relatedPages(p: WikiPage, limit = 6) {
  const family = p.slug.split("/").slice(0, 2).join("/");
  const same = data.pages.filter((x) => x.slug !== p.slug && x.slug.startsWith(family + "/"));
  const cat = data.pages.filter((x) => x.slug !== p.slug && x.category === p.category && !same.includes(x));
  return [...same, ...cat].slice(0, limit);
}

export function siblings(p: WikiPage) {
  const list = data.pages.filter((x) => x.category === p.category);
  const i = list.findIndex((x) => x.slug === p.slug);
  return { prev: i > 0 ? list[i - 1] : null, next: i >= 0 && i < list.length - 1 ? list[i + 1] : null };
}

/** Render-time helper: wiki links were stored with a locale placeholder. */
export const withLocale = (html: string, locale: string) => html.replaceAll("/__LOCALE__/", `/${locale}/`);
