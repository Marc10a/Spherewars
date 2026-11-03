// Environment-bound WooCommerce layer (server only). Without WC_API_URL + keys the shop keeps using Supabase + Stripe.
import { factions } from "@/content/factions";
import type { Product } from "@/lib/data";
import type { ShopSettings } from "@/lib/shop/pricing";
import { wcGet, wcPost, type WcOptions } from "./client";
import { wcLocationList, wcMethodList, wcOrderCreated, wcProductList, wcZoneList } from "./contract";
import { orderBody, shippingLineFor, toProduct, toSettings, toZone, type ZoneDetail } from "./map";

const opts = (): WcOptions | null => {
  const baseUrl = process.env.WC_API_URL, key = process.env.WC_CONSUMER_KEY, secret = process.env.WC_CONSUMER_SECRET;
  return baseUrl && key && secret ? { baseUrl, key, secret } : null;
};
export const wooEnabled = () => opts() !== null;

/** Published products. null = WooCommerce unreachable/invalid (the shop then shows no products instead of stale or invented ones). */
export async function wooProducts(): Promise<Product[] | null> {
  const o = opts();
  if (!o) return null;
  const r = await wcGet("products", wcProductList, o, { status: "publish", per_page: 100 });
  return r ? r.map((p) => toProduct(p, factions.map((f) => f.slug))) : null;
}

/** Products by id, for checkout: read again from WooCommerce, never from what the browser sent. */
export async function wooProductsById(ids: string[]): Promise<Product[] | null> {
  const o = opts();
  if (!o || ids.some((i) => !/^\d+$/.test(i))) return null;
  const r = await wcGet("products", wcProductList, { ...o, revalidate: false }, { include: ids.join(","), per_page: 100 });
  return r ? r.map((p) => toProduct(p, factions.map((f) => f.slug))) : null;
}

/** Shipping zones configured in WooCommerce, in the model the cart already understands. */
export async function wooShipping(fresh = false): Promise<{ settings: ShopSettings; details: ZoneDetail[] } | null> {
  const o = opts();
  if (!o) return null;
  const oo = fresh ? { ...o, revalidate: false as const } : o;
  const zones = await wcGet("shipping/zones", wcZoneList, oo);
  if (!zones) return null;
  const details: ZoneDetail[] = [];
  for (const z of zones.filter((x) => x.id !== 0)) {
    const [locs, methods] = await Promise.all([wcGet(`shipping/zones/${z.id}/locations`, wcLocationList, oo), wcGet(`shipping/zones/${z.id}/methods`, wcMethodList, oo)]);
    if (!locs || !methods) continue;
    const d = toZone(z.id, z.name, locs.filter((l) => l.type === "country").map((l) => l.code.toUpperCase()), methods);
    if (d) details.push(d);
  }
  return { settings: toSettings(details), details };
}

/** Creates the pending order in WooCommerce and returns the URL where the customer pays (WooCommerce's own payment page). */
export async function wooCreateOrder(lines: { id: string; qty: number }[], country: string, detail: ZoneDetail, shipping_cents: number): Promise<string | null> {
  const o = opts();
  if (!o) return null;
  const r = await wcPost("orders", wcOrderCreated, o, orderBody(lines, country, shippingLineFor(detail, shipping_cents)));
  // The payment page must live on the WooCommerce host: never redirect a customer to a URL on another domain.
  if (!r) return null;
  try { return new URL(r.payment_url).hostname === new URL(o.baseUrl).hostname ? r.payment_url : null; } catch { return null; }
}
