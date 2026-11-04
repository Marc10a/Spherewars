// Pure mapping from WooCommerce data to the shapes the shop already uses (Product, ShopSettings). Unit tested.
import { createHmac, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import type { Product } from "@/lib/data";
import type { ShippingZone, ShopSettings } from "@/lib/shop/pricing";
import type { WcMethod, WcOrderStatus, WcOrderSummary, WcProduct } from "./contract";

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

export type ZoneInput = { id: number; name: string; locations: { code: string; type: string }[]; methods: WcMethod[] };

/**
 * All zones of WooCommerce -> the zones the cart can charge exactly, in WooCommerce's zone order. WooCommerce picks the first zone that
 * matches (by zone order, not by how specific it is), and so does the cart. The cart only knows the country, so:
 * - continents become their countries (`continents` holds WooCommerce's own list);
 * - a country with a state or postcode rule anywhere depends on the address: it is not sold, at any rate (Canaries, Balearics...);
 * - a country in a zone that cannot be charged exactly (formula, classes) stays closed and never falls through to a later zone.
 * Zone 0 ("rest of the world") is not passed here: it has no list of countries, so those destinations are not sold.
 */
export function resolveZones(zones: ZoneInput[], continents: Record<string, string[]>): ZoneDetail[] {
  const read = zones.map((z) => {
    const of = (type: string) => z.locations.filter((l) => l.type === type).map((l) => l.code.toUpperCase());
    const countries = [...of("country"), ...of("continent").flatMap((c) => continents[c] ?? [])];
    const stateCountries = of("state").map((s) => s.split(":")[0]);
    // A location type this code does not know is treated like a postcode rule: the zone may not apply to the whole country.
    const narrowed = z.locations.some((l) => !["country", "continent", "state"].includes(l.type));
    return { z, countries, stateCountries, narrowed };
  });
  const address = new Set(read.flatMap((r) => (r.narrowed ? [...r.countries, ...r.stateCountries] : r.stateCountries)));
  const taken = new Set<string>();
  return read.flatMap((r) => {
    const free = r.countries.filter((c) => !address.has(c) && !taken.has(c));
    r.countries.forEach((c) => taken.add(c));
    const d = r.narrowed ? null : toZone(r.z.id, r.z.name, free, r.z.methods);
    return d ? [d] : [];
  });
}

/** Payment can only be taken if a gateway is on and, when WooCommerce says so, finished setting up. */
export const hasUsableGateway = (gateways: { enabled: boolean; needs_setup?: boolean }[]) => gateways.some((g) => g.enabled && g.needs_setup !== true);

export const toSettings = (zones: ZoneDetail[]): ShopSettings => ({ enabled: zones.length > 0, currency: "EUR", zones: zones.map((z) => z.zone).slice(0, 6) });

/** The shipping line sent with the order, so WooCommerce charges exactly what the cart showed. */
export function shippingLineFor(d: ZoneDetail, shipping_cents: number) {
  const m = shipping_cents === 0 && d.free ? d.free : d.flat ?? d.free!;
  return { method_id: m.method_id, instance_id: String(m.instance_id), method_title: m.title || d.zone.label, total: (shipping_cents / 100).toFixed(2) };
}

/** Order body for POST /wc/v3/orders. Only product ids and quantities: WooCommerce computes prices, stock and taxes itself. */
export function orderBody(lines: { id: string; qty: number }[], country: string, ship: ReturnType<typeof shippingLineFor>, meta: Record<string, string> = {}) {
  return {
    status: "pending", set_paid: false,
    billing: { country }, shipping: { country },
    line_items: lines.map((l) => ({ product_id: Number(l.id), quantity: l.qty })),
    shipping_lines: [ship],
    ...(Object.keys(meta).length ? { meta_data: Object.entries(meta).map(([key, value]) => ({ key, value })) } : {}),
  };
}

// ---- checkout safety: no duplicate orders, limited unpaid orders ---------------------------------------------------------------

export const META_KEY = "sw_checkout_key", META_CLIENT = "sw_client", META_NETWORK = "sw_network", META_RETURN = "sw_return_url";
export const ORDER_WINDOW_MS = 3600e3;
export const MAX_ATTEMPTS_PER_HOUR = 20; // same as the PHP theme
export const MAX_NETWORK_ATTEMPTS_PER_HOUR = 60;
export const MAX_OPEN_PER_CLIENT = 5, MAX_OPEN_PER_NETWORK = 15;
/** From this many unpaid orders the shop is under pressure: limits tighten and an alert is logged. It never closes for everyone. */
export const PRESSURE_OPEN_ORDERS = 40;
export const PRESSURE_OPEN_PER_CLIENT = 1, PRESSURE_OPEN_PER_NETWORK = 3;

const hmac = (secret: string, value: string) => createHmac("sha256", secret).update(value).digest("hex").slice(0, 32);

export type Env = Record<string, string | undefined>;
export type IpSource = { header: string; hops: number } | "local";

/**
 * Where the visitor's IP can be trusted from. A header is only trustworthy if the host's own proxy sets it, otherwise anyone can send a
 * different one per request. So: an explicit setting, or Vercel's own header. Anything else in production = no source (checkout closes).
 */
export function clientIpSource(env: Env): IpSource | null {
  const header = env.WC_CLIENT_IP_HEADER?.trim().toLowerCase();
  if (header && /^[a-z0-9-]{1,64}$/.test(header)) {
    const hops = Number(env.WC_TRUSTED_PROXY_HOPS ?? 1);
    return Number.isInteger(hops) && hops >= 1 && hops <= 10 ? { header, hops } : null;
  }
  if (header) return null;
  if (env.VERCEL) return { header: "x-vercel-forwarded-for", hops: 1 };
  return env.NODE_ENV === "production" ? null : "local";
}

/** The IP added by the trusted proxy: counted from the right, because whatever is further left was sent by the client. Invalid = null. */
export function clientIpFrom(get: (name: string) => string | null | undefined, source: IpSource | null): string | null {
  if (!source) return null;
  if (source === "local") return "127.0.0.1";
  const parts = (get(source.header) ?? "").split(",").map((x) => x.trim());
  const ip = parts[parts.length - source.hops] ?? "";
  return isIP(ip) ? ip : null;
}

/** Eight IPv6 groups as numbers, or null. Handles "::" and a dotted IPv4 tail. */
function ipv6Groups(ip: string): number[] | null {
  const v4 = ip.match(/^(.*:)(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  const text = v4 ? `${v4[1]}${((Number(v4[2]) << 8) | Number(v4[3])).toString(16)}:${((Number(v4[4]) << 8) | Number(v4[5])).toString(16)}` : ip;
  const [head, tail] = text.split("::");
  const nums = (s: string | undefined) => (s ? s.split(":").map((g) => parseInt(g, 16)) : []);
  const a = nums(head), b = nums(tail);
  return tail === undefined ? a : [...a, ...Array(8 - a.length - b.length).fill(0), ...b];
}

export type Visitor = { client: string; network: string };

/**
 * Limits count per network block, not per address: one IPv6 customer owns a whole /64, and a /48 or an IPv4 /24 is cheap to rotate within.
 * client = IPv4 address or IPv6 /64. network = IPv4 /24 or IPv6 /48. Stored as keyed hashes, never as the IP.
 */
export function visitorOf(secret: string, rawIp: string): Visitor {
  const ip = rawIp.split("%")[0];
  const groups = isIP(ip) === 6 ? ipv6Groups(ip) : null;
  const isMapped = groups?.slice(0, 5).every((g) => g === 0) && groups[5] === 0xffff;
  const v4 = groups && !isMapped ? null : groups ? [groups[6] >> 8, groups[6] & 255, groups[7] >> 8, groups[7] & 255].join(".") : ip;
  const client = v4 ?? groups!.slice(0, 4).map((g) => g.toString(16)).join(":");
  const network = v4 ? v4.split(".").slice(0, 3).join(".") : groups!.slice(0, 3).map((g) => g.toString(16)).join(":");
  return { client: hmac(secret, `client:${client}`), network: hmac(secret, `network:${network}`) };
}

/** Per-browser checkout id, so two customers behind one IP with the same cart never share an order. Set by the server, unreadable from scripts. */
export const CHECKOUT_COOKIE = "sw_checkout";
export const parseBrowserId = (v: string | undefined) => (v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v) ? v : null);
export const browserCookieOptions = (production: boolean) => ({ httpOnly: true, secure: production, sameSite: "lax" as const, path: "/", maxAge: 86_400 });

/** Same browser + same visitor + same lines at the same prices + same destination = same key, so a retry finds its own order and nobody else's. */
export function checkoutKey(secret: string, browser: string, client: string, lines: { id: string; qty: number; unit_cents: number }[], country: string, shipping_cents: number) {
  const items = lines.map((l) => `${l.id}:${l.qty}:${l.unit_cents}`).sort().join(",");
  return hmac(secret, `order:${browser}|${client}|${items}|${country}|${shipping_cents}`);
}

const metaOf = (o: WcOrderSummary, key: string) => o.meta_data.find((m) => m.key === key)?.value;

/** WooCommerce sends GMT dates without a zone. An unreadable date counts as recent, so it can only make the limits stricter. */
const isRecent = (o: WcOrderSummary, now: number) => {
  const t = Date.parse(`${o.date_created_gmt}Z`);
  return Number.isNaN(t) || now - t < ORDER_WINDOW_MS;
};

/** The unpaid order this checkout already created, if there is one that can still be paid. */
export function findExistingOrder(orders: WcOrderSummary[], key: string, now: number) {
  return orders.find((o) => isRecent(o, now) && o.status === "pending" && o.needs_payment !== false && o.payment_url !== null && metaOf(o, META_KEY) === key);
}

/**
 * Durable limit: it counts real orders in WooCommerce, so it holds across server restarts and instances. There is deliberately no global
 * refusal, which anyone could trigger to close the shop for everyone. Under pressure each visitor and network just gets a much smaller allowance.
 * The read is capped at 100 orders, so a full page also counts as pressure.
 */
export function orderLimit(orders: WcOrderSummary[], visitor: Visitor, now: number) {
  const open = orders.filter((o) => o.status === "pending" && isRecent(o, now) && metaOf(o, META_KEY) !== undefined);
  const pressure = open.length >= PRESSURE_OPEN_ORDERS || orders.length >= 100;
  const count = (key: string, value: string) => open.filter((o) => metaOf(o, key) === value).length;
  const over = count(META_CLIENT, visitor.client) >= (pressure ? PRESSURE_OPEN_PER_CLIENT : MAX_OPEN_PER_CLIENT)
    || count(META_NETWORK, visitor.network) >= (pressure ? PRESSURE_OPEN_PER_NETWORK : MAX_OPEN_PER_NETWORK);
  return { over, pressure };
}

/**
 * First barrier, before any call to WooCommerce. In memory, so per server instance: orderLimit is the durable one.
 * A full table forgets its oldest entries instead of refusing newcomers, so filling it can never lock out other visitors.
 */
export function attemptLimiter(max = MAX_ATTEMPTS_PER_HOUR, windowMs = ORDER_WINDOW_MS, maxClients = 5000) {
  const seen = new Map<string, { count: number; start: number }>();
  return (client: string, now = Date.now()): boolean => {
    const cur = seen.get(client);
    if (cur && now - cur.start < windowMs) {
      cur.count++;
      return cur.count <= max;
    }
    seen.delete(client);
    if (seen.size >= maxClients) for (const [k, v] of seen) if (now - v.start >= windowMs) seen.delete(k);
    while (seen.size >= maxClients) seen.delete(seen.keys().next().value as string);
    seen.set(client, { count: 1, start: now });
    return true;
  };
}

// ---- way back from WooCommerce -----------------------------------------------------------------------------------------------

/** Where WooCommerce should send the customer after paying. Needs the snippet in docs/WORDPRESS.md: without it, this meta does nothing. */
export const returnUrlFor = (site: string | undefined, locale: string) => (site?.startsWith("https://") ? `${site.replace(/\/+$/, "")}/${locale}/tienda/gracias` : null);

/** Reading the order is the only proof of payment, never the URL. null = the key does not match this order. */
export function orderReturnState(order: WcOrderStatus, key: string) {
  const a = Buffer.from(order.order_key), b = Buffer.from(key);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return { number: order.number, status: order.status, paid: ["processing", "completed"].includes(order.status) };
}

/** Back to the cart with the error code and, when known, the failed line: `?e=<code>&line=<product id>`. Only numeric WooCommerce ids pass. */
export const cartErrorPath = (locale: string, code: string, productId?: string) =>
  `/${locale}/tienda/carrito?e=${code}${productId && /^[0-9]{1,12}$/.test(productId) ? `&line=${productId}` : ""}`;
