// Pure mapping from WooCommerce data to the shapes the shop already uses (Product, ShopSettings). Unit tested.
import type { Product } from "@/lib/data";
import type { ShippingZone, ShopSettings } from "@/lib/shop/pricing";
import type { WcMethod, WcProduct } from "./contract";

/** "12.50" -> 1250. Returns null for empty/invalid/non-positive prices (such a product cannot be bought). */
export function toCents(v: string | null | undefined): number | null {
  if (!v || !/^\d+(\.\d{1,4})?$/.test(v.trim())) return null;
  const c = Math.round(parseFloat(v) * 100);
  return c > 0 ? c : null;
}

/** Shipping cost (>= 0). Distinct from toCents because a free/zero flat rate is valid. */
export function toCostCents(v: string | null | undefined): number | null {
  if (v === undefined || v === null || !/^\d+([.,]\d{1,4})?$/.test(v.trim())) return null;
  return Math.round(parseFloat(v.replace(",", ".")) * 100);
}

const wikiSlugRe = /^personajes\/[a-z0-9-]+\/[a-z0-9-]+$/;

export function toProduct(p: WcProduct, factionSlugs: string[]): Product {
  const meta = p.meta_data.find((m) => m.key === "sw_wiki_slug")?.value;
  const price = toCents(p.price);
  const stock = p.manage_stock ? Math.max(0, p.stock_quantity ?? 0) : p.stock_status === "outofstock" ? 0 : null;
  const faction = p.categories.find((c) => factionSlugs.includes(c.slug))?.slug;
  return {
    id: String(p.id), slug: p.slug, name: p.name, category: "miniature", description: null, contents: null,
    price_cents: price, currency: "EUR", commercial_status: p.stock_status, buy_url: null, profile_url: null,
    stock, sellable: p.status === "publish" && price !== null, wiki_slug: typeof meta === "string" && wikiSlugRe.test(meta) ? meta : null,
    image_path: null, image_alt: p.images[0]?.alt || p.name, factions: faction ? { slug: faction } : null,
    images: p.images.map((i) => ({ src: i.src, alt: i.alt || p.name })),
  };
}

export type ZoneDetail = { zone: ShippingZone; flat: WcMethod | null; free: WcMethod | null };

/**
 * One shipping zone of WooCommerce -> the zone model of the shop. Only what can be reproduced exactly is supported:
 * flat rate with a plain numeric cost, and free shipping (always, or above a minimum amount). Anything else (formulas, shipping
 * classes, weight rates) makes the zone unavailable rather than charging a wrong amount.
 */
export function toZone(id: number, name: string, countries: string[], methods: WcMethod[]): ZoneDetail | null {
  const flat = methods.find((m) => m.enabled && m.method_id === "flat_rate" && toCostCents(m.settings.cost?.value) !== null) ?? null;
  const free = methods.find((m) => m.enabled && m.method_id === "free_shipping" && ["", "min_amount", "either"].includes(m.settings.requires?.value ?? "")) ?? null;
  if (!flat && !free) return null;
  const freeAlways = Boolean(free) && !free!.settings.requires?.value;
  const freeOver = free && free.settings.requires?.value ? toCents(free.settings.min_amount?.value) : null;
  const price = freeAlways ? 0 : flat ? toCostCents(flat.settings.cost?.value) : null;
  if (price === null) return null; // only a "free over X" method and no flat rate: below X there is no way to ship
  const codes = [...new Set(countries.filter((c) => /^[A-Z]{2}$/.test(c)))];
  if (!codes.length) return null;
  return { zone: { id: String(id), label: name.slice(0, 80) || String(id), countries: codes, price_cents: price, free_over_cents: freeOver }, flat, free };
}

export const toSettings = (zones: ZoneDetail[]): ShopSettings => ({ enabled: zones.length > 0, currency: "EUR", zones: zones.map((z) => z.zone).slice(0, 6) });

/** The shipping line sent with the order, so WooCommerce charges exactly what the cart showed. */
export function shippingLineFor(d: ZoneDetail, shipping_cents: number) {
  const m = shipping_cents === 0 && d.free ? d.free : d.flat ?? d.free!;
  return { method_id: m.method_id, instance_id: String(m.instance_id), method_title: m.title || d.zone.label, total: (shipping_cents / 100).toFixed(2) };
}

/** Order body for POST /wc/v3/orders. Only product ids and quantities: WooCommerce computes prices, stock and taxes itself. */
export function orderBody(lines: { id: string; qty: number }[], country: string, ship: ReturnType<typeof shippingLineFor>) {
  return {
    status: "pending", set_paid: false,
    billing: { country }, shipping: { country },
    line_items: lines.map((l) => ({ product_id: Number(l.id), quantity: l.qty })),
    shipping_lines: [ship],
  };
}
