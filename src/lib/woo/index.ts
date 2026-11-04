// Environment-bound WooCommerce layer (server only). Without WC_API_URL + keys the shop keeps using Supabase + Stripe.
import { factions } from "@/content/factions";
import { wcGet, type WcOptions } from "./client";
import { parseProductList, wcGatewayList, wcMethodList, wcOrderStatus, wcRawList, wcZoneList } from "./contract";
import { checkoutLink, hasUsableGateway, orderReturnState, toProduct, type WooProduct } from "./map";

const opts = (): WcOptions | null => {
  const baseUrl = process.env.WC_API_URL, key = process.env.WC_CONSUMER_KEY, secret = process.env.WC_CONSUMER_SECRET;
  return baseUrl && key && secret ? { baseUrl, key, secret } : null;
};
const read = (o: WcOptions, fresh: boolean): WcOptions => (fresh ? { ...o, revalidate: false } : o);
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
  const r = await wcGet("products", wcRawList, read(o, true), { include: ids.join(","), per_page: 100 });
  return r ? parseProductList(r).map((p) => toProduct(p, factions.map((f) => f.slug))) : null;
}

/** True if at least one shipping method is on. Which one applies, and its cost with IVA, is WooCommerce's decision at checkout, with the real address. */
export async function wooShippingReady(fresh = false): Promise<boolean> {
  const o = opts();
  if (!o) return false;
  const zones = await wcGet("shipping/zones", wcZoneList, read(o, fresh));
  if (!zones) return false;
  const methods = await Promise.all(zones.map((z) => wcGet(`shipping/zones/${z.id}/methods`, wcMethodList, read(o, fresh))));
  return methods.some((list) => list?.some((m) => m.enabled));
}

/** True only if WooCommerce confirms a gateway that can take the payment. Unreadable (error, or a key without permission) counts as no. */
export async function wooPaymentReady(fresh = false): Promise<boolean> {
  const o = opts();
  if (!o) return false;
  const r = await wcGet("payment_gateways", wcGatewayList, read(o, fresh));
  return r ? hasUsableGateway(r) : false;
}

/** Where the customer goes to give their address and pay: WooCommerce's own checkout, which builds the cart and the order from its own prices. */
export function wooCheckoutUrl(lines: { id: string; qty: number }[], locale: string): string | null {
  const o = opts();
  return o ? checkoutLink(o.baseUrl, lines, locale) : null;
}

/** What the "thanks" page needs after the customer returns (?wc_order=&wc_key=). Read from WooCommerce: the URL proves nothing. */
export async function wooOrderReturn(id: string, key: string) {
  const o = opts();
  if (!o || !/^[0-9]{1,12}$/.test(id) || !/^wc_order_[A-Za-z0-9]{1,64}$/.test(key)) return null;
  const order = await wcGet(`orders/${id}`, wcOrderStatus, read(o, true));
  return order ? orderReturnState(order, key) : null;
}
