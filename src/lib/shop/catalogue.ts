import { factions, type Faction } from "@/content/factions";
import { formatPrice, mediaUrl, type Product } from "@/lib/data";
import type { Locale } from "@/lib/i18n";
import { productFacts } from "@/lib/shop/facts";
import { productForMiniature } from "@/lib/shop/match";
import { packFor } from "@/lib/shop/packs";
import { characterInfo, factionCharacters, miniVisual, ownerPhotos, shopKey, type WikiPage } from "@/lib/wiki";

export type ShopStatus = "available" | "soldOut" | "unlisted";

export type ShopEntry = {
  key: string;
  faction: Faction;
  isPack: boolean;
  name: string;
  /** Every wiki title of this SKU (one product can have two wiki pages). */
  aliases: string[];
  ref: string | null;
  href: string;
  /** Real photo of the miniature(s). Null when there is none: never replaced by an illustration. */
  photo: string | null;
  /** True when `photo` is a scene that fills the tile instead of a cut-out miniature. */
  photoFills: boolean;
  /** The owner's photo of the miniature in a scene, shown on hover over a cut-out. */
  scene: string | null;
  cents: number | null;
  price: string | null;
  points: string | null;
  models: number | null;
  items: string[];
  subfaction: string | null;
  status: ShopStatus;
  product: Product | null;
};

const spec = (key: string, label: string) => productFacts(key)?.specs.find((s) => s.label === label)?.value ?? null;

/** A photo hosted where next/image is allowed to read it: the same rule as the product page. */
function sourcePhoto(product: Product | null) {
  if (!product) return null;
  const own = mediaUrl(product.image_path);
  if (own) return own;
  const host = process.env.WC_API_URL ? new URL(process.env.WC_API_URL).hostname : null;
  return (product.images ?? []).find((i) => { try { return i.src.startsWith("https://") && new URL(i.src).hostname === host; } catch { return false; } })?.src ?? null;
}

function subfactionOf(f: Faction, key: string, page: WikiPage | null) {
  const official = spec(key, "Subfacción");
  if (official || !f.subfactions || !page) return official;
  const affiliation = (characterInfo(page).affiliation ?? "").toLowerCase();
  return f.subfactions.find((s) => affiliation.includes(s.name.split(" ")[0].toLowerCase()))?.name ?? null;
}

function entry(f: Faction, key: string, pages: WikiPage[], products: Product[], locale: Locale): ShopEntry {
  const facts = productFacts(key);
  const pack = key.startsWith("packs/");
  // One SKU can be linked from any of its wiki pages: use the page the product is actually linked to.
  const slugs = [key, ...pages.map((p) => p.slug).filter((s) => s !== key)];
  const linked = slugs.find((s) => productForMiniature(products, s));
  const found = linked ? productForMiniature(products, linked)! : null;
  const product = found?.sellable && found.price_cents && found.price_cents > 0 ? found : null;
  const page = pages.find((p) => p.slug === linked) ?? pages.find((p) => p.slug === key) ?? pages[0] ?? null;
  const shots = ownerPhotos(key)?.gallery ?? [];
  const visual = page ? miniVisual(page) : null;
  const photo = pack ? packFor(f.slug)?.image ?? null
    : shots.find((g) => g.kind === "clean")?.src ?? ownerPhotos(key)?.tile ?? sourcePhoto(product) ?? (visual?.kind === "photo" ? visual.src : null);
  const clean = shots.some((g) => g.kind === "clean");
  const packModels = pack ? Number(spec(key, "Número de miniaturas")) || null : null;
  return {
    key, faction: f, isPack: pack,
    name: pack ? (facts?.title ?? key).replace(/\s*—\s*Starter Pack$/i, "") : facts?.name ?? page?.title ?? key,
    aliases: pages.map((p) => p.title),
    ref: facts?.ref ?? null,
    href: `/${locale}/tienda/${f.slug}/${pack ? "starter-pack" : (page?.slug ?? key).split("/").pop()}`,
    photo, photoFills: !pack && !clean && Boolean(ownerPhotos(key)),
    scene: !pack && clean ? shots.find((g) => g.kind === "bg")?.src ?? null : null,
    cents: product?.price_cents ?? null,
    price: product ? formatPrice(product.price_cents, product.currency, locale) : null,
    points: spec(key, "Puntos de Banda"),
    models: packModels ?? facts?.models ?? null,
    items: facts?.items ?? [],
    subfaction: subfactionOf(f, key, page),
    status: !product ? "unlisted" : product.stock === 0 ? "soldOut" : "available",
    product,
  };
}

export type Catalogue = { packs: ShopEntry[]; singles: ShopEntry[]; unlisted: ShopEntry[] };

/** The catalogue as a shopper sees it: Starter Packs, singles that have a price, and what is not on sale yet. One entry per SKU. */
export function buildCatalogue(products: Product[], locale: Locale, only?: Faction): Catalogue {
  const out: Catalogue = { packs: [], singles: [], unlisted: [] };
  for (const f of only ? [only] : factions) {
    const pack = packFor(f.slug);
    if (pack) out.packs.push(entry(f, pack.key, [], products, locale));
    const skus = new Map<string, WikiPage[]>();
    for (const p of factionCharacters(f.slug)) skus.set(shopKey(p.slug), [...(skus.get(shopKey(p.slug)) ?? []), p]);
    for (const [key, pages] of skus) {
      const e = entry(f, key, pages, products, locale);
      (e.status === "unlisted" ? out.unlisted : out.singles).push(e);
    }
  }
  return out;
}

export type ShopType = "starter" | "sueltas";
export type ShopSort = "precio" | "puntos";
export type ShopQuery = { tipo: ShopType | null; orden: ShopSort | null };

export function parseShopQuery(sp: { tipo?: string | string[]; orden?: string | string[] }): ShopQuery {
  return {
    tipo: sp.tipo === "starter" || sp.tipo === "sueltas" ? sp.tipo : null,
    orden: sp.orden === "precio" || sp.orden === "puntos" ? sp.orden : null,
  };
}

/** Parameters in alphabetical order: the WordPress export stores each filtered page under this exact URL. */
export function shopHref(locale: string, faction: string | null, q: ShopQuery) {
  const qs = new URLSearchParams();
  if (q.orden) qs.set("orden", q.orden);
  if (q.tipo) qs.set("tipo", q.tipo);
  const s = qs.toString();
  return `/${locale}/tienda${faction ? `/${faction}` : ""}${s ? `?${s}` : ""}`;
}

/** "14 o 12" sorts as 14. Entries without a value go last; ties keep the catalogue order. */
const pointsValue = (e: ShopEntry) => { const n = parseInt(e.points ?? "", 10); return Number.isNaN(n) ? Infinity : n; };
export function sortEntries(list: ShopEntry[], orden: ShopSort | null) {
  if (!orden) return list;
  const value = orden === "precio" ? (e: ShopEntry) => e.cents ?? Infinity : pointsValue;
  return [...list].sort((a, b) => { const d = value(a) - value(b); return Number.isNaN(d) ? 0 : d; });
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

/** Accent-insensitive search over the product names, references, factions and pack contents. Name matches come first. */
export function searchCatalogue(c: Catalogue, raw: string): ShopEntry[] {
  const words = norm(raw).split(/\s+/).filter((w) => w.length > 1);
  if (!words.length) return [];
  const all = [...c.packs, ...c.singles, ...c.unlisted];
  const hits = all.filter((e) => {
    const hay = norm([e.name, ...e.aliases, e.ref, e.faction.name, e.subfaction, e.isPack ? "starter pack" : null, ...e.items].filter(Boolean).join(" "));
    return words.every((w) => hay.includes(w));
  });
  const inName = (e: ShopEntry) => words.some((w) => norm(`${e.name} ${e.aliases.join(" ")}`).includes(w));
  return [...hits.filter(inName), ...hits.filter((e) => !inName(e))];
}
