// Pure pricing logic (no framework or I/O imports) so it can run on the server AND in the browser, and be unit tested.
// The SERVER is the authority: the browser only previews totals. Prices always come from the database.

export type ShopProduct = {
  id: string; name: string; sku: string | null; price_cents: number | null; currency: string | null;
  stock: number | null; sellable: boolean;
};
export type ShippingZone = { id: string; label: string; countries: string[]; price_cents: number; free_over_cents: number | null };
export type ShopSettings = { enabled: boolean; currency: string; zones: ShippingZone[] };
export type CartInput = { id: string; qty: number }[];

export type CartLine = { product: ShopProduct; qty: number; unit_cents: number; line_cents: number };
export type CartError = "empty" | "too_many" | "bad_qty" | "unavailable" | "out_of_stock" | "no_zone" | "bad_country";
export type CartResult =
  | { ok: true; lines: CartLine[]; subtotal_cents: number; shipping_cents: number; total_cents: number; zone: ShippingZone }
  | { ok: false; error: CartError; productId?: string };

export const MAX_QTY_PER_LINE = 20;
export const MAX_LINES = 30;

/** Every country the shop ships to, across all zones. */
export const shippableCountries = (s: ShopSettings) => [...new Set(s.zones.flatMap((z) => z.countries))].sort();

export function zoneFor(s: ShopSettings, country: string): ShippingZone | null {
  return s.zones.find((z) => z.countries.includes(country)) ?? null;
}

export function computeCart(input: CartInput, products: Map<string, ShopProduct>, settings: ShopSettings, country: string): CartResult {
  if (!/^[A-Z]{2}$/.test(country)) return { ok: false, error: "bad_country" };
  if (input.length === 0) return { ok: false, error: "empty" };
  if (input.length > MAX_LINES) return { ok: false, error: "too_many" };

  // Merge duplicate lines of the same product.
  const merged = new Map<string, number>();
  for (const { id, qty } of input) {
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_LINE) return { ok: false, error: "bad_qty", productId: id };
    merged.set(id, (merged.get(id) ?? 0) + qty);
  }

  const lines: CartLine[] = [];
  for (const [id, qty] of merged) {
    const p = products.get(id);
    if (!p || !p.sellable || p.price_cents == null || p.price_cents <= 0) return { ok: false, error: "unavailable", productId: id };
    if (qty > MAX_QTY_PER_LINE) return { ok: false, error: "bad_qty", productId: id };
    if (p.stock !== null && qty > p.stock) return { ok: false, error: "out_of_stock", productId: id };
    lines.push({ product: p, qty, unit_cents: p.price_cents, line_cents: p.price_cents * qty });
  }

  const zone = zoneFor(settings, country);
  if (!zone) return { ok: false, error: "no_zone" };

  const subtotal = lines.reduce((n, l) => n + l.line_cents, 0);
  const free = zone.free_over_cents !== null && subtotal >= zone.free_over_cents;
  const shipping = free ? 0 : zone.price_cents;
  return { ok: true, lines, subtotal_cents: subtotal, shipping_cents: shipping, total_cents: subtotal + shipping, zone };
}
