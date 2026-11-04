// Pure mapping from WooCommerce data to the shapes the shop already uses. Unit tested.
import { timingSafeEqual } from "node:crypto";
import type { Product } from "@/lib/data";
import type { WcOrderStatus, WcProduct } from "./contract";

/** "12.50" -> 1250. Returns null for empty/invalid/non-positive prices (such a product cannot be bought). */
export function toCents(v: string | null | undefined): number | null {
  if (!v || !/^\d+(\.\d{1,4})?$/.test(v.trim())) return null;
  const c = Math.round(parseFloat(v) * 100);
  return c > 0 ? c : null;
}

const wikiSlugRe = /^personajes\/[a-z0-9-]+\/[a-z0-9-]+$/;

/** Accepted link to the owner's catalogue: a wiki miniature, or the Starter Pack of a real faction (`packs/<faction>`). */
function wikiLink(v: unknown, factionSlugs: string[]): string | null {
  if (typeof v !== "string") return null;
  return wikiSlugRe.test(v) || (v.startsWith("packs/") && factionSlugs.includes(v.slice(6))) ? v : null;
}

/**
 * `price_cents` is always what WooCommerce charges now. The rest is only for showing a discount, and is optional for other product sources.
 * `sale_price_cents` is set only while a sale is really active and lower than the regular price.
 */
export type WooProduct = Product & { regular_price_cents: number | null; sale_price_cents: number | null };

export function toProduct(p: WcProduct, factionSlugs: string[]): WooProduct {
  const wiki = wikiLink(p.meta_data.find((m) => m.key === "sw_wiki_slug")?.value, factionSlugs);
  const pack = wiki?.startsWith("packs/") ? wiki.slice(6) : null;
  const price = toCents(p.price);
  const regular = toCents(p.regular_price);
  const stock = p.manage_stock ? Math.max(0, p.stock_quantity ?? 0) : p.stock_status === "outofstock" ? 0 : null;
  const faction = p.categories.find((c) => factionSlugs.includes(c.slug))?.slug ?? pack;
  return {
    id: String(p.id), slug: p.slug, name: p.name, category: pack ? "pack" : "miniature", description: null, contents: null,
    price_cents: price, currency: "EUR", commercial_status: p.stock_status, buy_url: null, profile_url: null,
    stock, sellable: p.status === "publish" && price !== null, wiki_slug: wiki,
    image_path: null, image_alt: p.images[0]?.alt || p.name, factions: faction ? { slug: faction } : null,
    images: p.images.map((i) => ({ src: i.src, alt: i.alt || p.name })),
    regular_price_cents: regular,
    sale_price_cents: p.on_sale && price !== null && regular !== null && price < regular ? price : null,
  };
}

/** Payment can only be taken if a gateway is on and, when WooCommerce says so, finished setting up. */
export const hasUsableGateway = (gateways: { enabled: boolean; needs_setup?: boolean }[]) => gateways.some((g) => g.enabled && g.needs_setup !== true);

/**
 * WooCommerce's checkout link: /checkout-link/?products=ID:qty,ID:qty. It empties that browser's WooCommerce cart, fills it and opens the normal checkout, which
 * collects the address and email and computes prices, IVA and shipping. sw_lang is kept through the redirect; the mu-plugin uses it to send the buyer back in their language.
 */
export function checkoutLink(baseUrl: string, lines: { id: string; qty: number }[], locale: string) {
  const u = new URL("/checkout-link/", baseUrl.replace(/\/+$/, "") + "/");
  u.search = `products=${lines.map((l) => `${l.id}:${l.qty}`).join(",")}&sw_lang=${locale}`;
  return u.toString();
}

/** Reading the order is the only proof of payment, never the URL. null = the key does not match this order. */
export function orderReturnState(order: WcOrderStatus, key: string) {
  const a = Buffer.from(order.order_key), b = Buffer.from(key);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return { number: order.number, status: order.status, paid: ["processing", "completed"].includes(order.status) };
}

/** Back to the cart with the error code and, when known, the failed line: `?e=<code>&line=<product id>`. Only numeric WooCommerce ids pass. */
export const cartErrorPath = (locale: string, code: string, productId?: string) =>
  `/${locale}/tienda/carrito?e=${code}${productId && /^[0-9]{1,12}$/.test(productId) ? `&line=${productId}` : ""}`;
