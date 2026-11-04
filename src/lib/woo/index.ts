// Environment-bound WooCommerce layer (server only). Without WC_API_URL + keys the shop keeps using Supabase + Stripe.
import { factions } from "@/content/factions";
import type { ShopSettings } from "@/lib/shop/pricing";
import { wcGet, wcWrite, type WcOptions } from "./client";
import { parseProductList, wcContinent, wcGatewayList, wcLocationList, wcMethodList, wcOrderCreated, wcOrderList, wcOrderStatus, wcRawList, wcZoneList } from "./contract";
import { attemptLimiter, checkoutKey, clientIpFrom, clientIpSource, findExistingOrder, hasUsableGateway, MAX_NETWORK_ATTEMPTS_PER_HOUR, META_CLIENT, META_KEY, META_NETWORK, META_RETURN, ORDER_WINDOW_MS, orderLimit, visitorOf, orderBody, orderReturnState, resolveZones, shippingLineFor, toProduct, toSettings, type Visitor, type WooProduct, type ZoneDetail, type ZoneInput } from "./map";

const opts = (): WcOptions | null => {
  const baseUrl = process.env.WC_API_URL, key = process.env.WC_CONSUMER_KEY, secret = process.env.WC_CONSUMER_SECRET;
  return baseUrl && key && secret ? { baseUrl, key, secret } : null;
};
export const wooEnabled = () => opts() !== null;

/** Published products. null = WooCommerce unreachable/invalid (the shop then shows no products instead of stale or invented ones). */
export async function wooProducts(): Promise<WooProduct[] | null> {
  const o = opts();
  if (!o) return null;
  const r = await wcGet("products", wcRawList, o, { status: "publish", per_page: 100 });
  return r ? parseProductList(r).map((p) => toProduct(p, factions.map((f) => f.slug))) : null;
}

/** Products by id, for checkout: read again from WooCommerce, never from what the browser sent. */
export async function wooProductsById(ids: string[]): Promise<WooProduct[] | null> {
  const o = opts();
  if (!o || ids.some((i) => !/^\d+$/.test(i))) return null;
  const r = await wcGet("products", wcRawList, { ...o, revalidate: false }, { include: ids.join(","), per_page: 100 });
  return r ? parseProductList(r).map((p) => toProduct(p, factions.map((f) => f.slug))) : null;
}

/** Shipping zones configured in WooCommerce, in the model the cart already understands. */
export async function wooShipping(fresh = false): Promise<{ settings: ShopSettings; details: ZoneDetail[] } | null> {
  const o = opts();
  if (!o) return null;
  const oo = fresh ? { ...o, revalidate: false as const } : o;
  const zones = await wcGet("shipping/zones", wcZoneList, oo);
  if (!zones) return null;
  // A zone or continent that cannot be read closes shipping: without it we cannot know which zone WooCommerce would pick for a country.
  const inputs: ZoneInput[] = [];
  for (const z of zones.filter((x) => x.id !== 0).sort((x, y) => x.order - y.order)) {
    const [locations, methods] = await Promise.all([wcGet(`shipping/zones/${z.id}/locations`, wcLocationList, oo), wcGet(`shipping/zones/${z.id}/methods`, wcMethodList, oo)]);
    if (!locations || !methods) return null;
    inputs.push({ id: z.id, name: z.name, locations, methods });
  }
  const continents: Record<string, string[]> = {};
  for (const code of new Set(inputs.flatMap((z) => z.locations.filter((l) => l.type === "continent").map((l) => l.code.toUpperCase())))) {
    if (!/^[A-Z]{2}$/.test(code)) return null;
    const c = await wcGet(`data/continents/${code.toLowerCase()}`, wcContinent, oo);
    if (!c) return null;
    continents[code] = c.countries.map((x) => x.code.toUpperCase());
  }
  const details = resolveZones(inputs, continents);
  return { settings: toSettings(details), details };
}

/** True only if WooCommerce confirms a gateway that can take the payment. Unreadable (error, or a key without permission) counts as no. */
export async function wooPaymentReady(fresh = false): Promise<boolean> {
  const o = opts();
  if (!o) return false;
  const r = await wcGet("payment_gateways", wcGatewayList, fresh ? { ...o, revalidate: false } : o);
  return r ? hasUsableGateway(r) : false;
}

const attempts = attemptLimiter();
const networkAttempts = attemptLimiter(MAX_NETWORK_ATTEMPTS_PER_HOUR);

/** False in production until the host's trusted IP source is known (docs/WORDPRESS.md): limits on a header anyone can fake protect nothing. */
export const wooClientIpReady = () => clientIpSource(process.env) !== null;

/** Anonymous visitor from the trusted IP source only. null = this request has no usable IP. */
export function wooVisitor(headers: { get(name: string): string | null }): Visitor | null {
  const ip = clientIpFrom((n) => headers.get(n), clientIpSource(process.env));
  return ip ? visitorOf(opts()?.secret ?? "", ip) : null;
}

/** Rate limit checked before any call to WooCommerce: 20 checkout attempts per visitor and hour, like the PHP theme, and a wider one per network. */
export const wooAllowAttempt = (v: Visitor) => {
  const client = attempts(v.client), network = networkAttempts(v.network);
  return client && network;
};

/** Unpaid orders of the last hour, newest first. WooCommerce may read `after` in its local time, so ask wider and let the map filter by GMT date. */
const recentOrders = (o: WcOptions) => wcGet("orders", wcOrderList, { ...o, revalidate: false }, {
  status: "pending", orderby: "date", order: "desc", per_page: 100, after: new Date(Date.now() - ORDER_WINDOW_MS - 14 * 3600e3).toISOString(),
});

/** What the "thanks" page needs after the customer returns (?wc_order=&wc_key=). Read from WooCommerce: the URL proves nothing. */
export async function wooOrderReturn(id: string, key: string) {
  const o = opts();
  if (!o || !/^[0-9]{1,12}$/.test(id) || !/^wc_order_[A-Za-z0-9]{1,64}$/.test(key)) return null;
  const order = await wcGet(`orders/${id}`, wcOrderStatus, { ...o, revalidate: false });
  return order ? orderReturnState(order, key) : null;
}

export type WooOrderInput = {
  lines: { id: string; qty: number; unit_cents: number }[];
  country: string; detail: ZoneDetail; shipping_cents: number;
  visitor: Visitor; browser: string; returnUrl: string | null;
  timeoutMs?: number; recheckMs?: number;
};
export type WooOrderResult = { url: string } | { error: "busy" | "failed" };

/**
 * Creates the pending order in WooCommerce and returns the URL where the customer pays (WooCommerce's own payment page). WooCommerce has no
 * idempotency key and cannot filter orders by meta, so a key is stored in the order's meta and looked for among recent unpaid orders:
 * before creating (a retry reuses the order) and after an unknown outcome such as a timeout. If those orders cannot be read, nothing is created.
 */
export async function wooCreateOrder(input: WooOrderInput): Promise<WooOrderResult> {
  const o = opts();
  if (!o) return { error: "failed" };
  const { lines, country, detail, shipping_cents, visitor, browser, returnUrl } = input;
  const key = checkoutKey(o.secret, browser, visitor.client, lines, country, shipping_cents);
  // The payment page must live on the WooCommerce host: never redirect a customer to a URL on another domain.
  const payable = (url: string | null): WooOrderResult => {
    try { return url && new URL(url).hostname === new URL(o.baseUrl).hostname ? { url } : { error: "failed" }; } catch { return { error: "failed" }; }
  };

  const recent = await recentOrders(o);
  if (!recent) return { error: "failed" };
  const existing = findExistingOrder(recent, key, Date.now());
  if (existing) return payable(existing.payment_url);
  const limit = orderLimit(recent, visitor, Date.now());
  if (limit.pressure) console.error(`woo: ALERT many unpaid checkout orders in the last hour (read ${recent.length}); per-visitor limits are tightened. Check WooCommerce > Orders.`);
  if (limit.over) return { error: "busy" };

  const body = orderBody(lines, country, shippingLineFor(detail, shipping_cents), { [META_KEY]: key, [META_CLIENT]: visitor.client, [META_NETWORK]: visitor.network, ...(returnUrl ? { [META_RETURN]: returnUrl } : {}) });
  const r = await wcWrite("orders", wcOrderCreated, { ...o, timeoutMs: input.timeoutMs ?? 15_000 }, body);
  if (r.ok) return payable(r.data.payment_url);
  if (!r.ambiguous) return { error: "failed" };

  // Unknown outcome: the order may exist. Look once more after a moment. If it has not appeared, the customer's next try looks again first.
  await new Promise((done) => setTimeout(done, input.recheckMs ?? 1500));
  const again = await recentOrders(o);
  const found = again && findExistingOrder(again, key, Date.now());
  return found ? payable(found.payment_url) : { error: "failed" };
}
