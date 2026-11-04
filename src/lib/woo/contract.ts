// Subset of the WooCommerce REST API v3 (/wp-json/wc/v3) that the shop reads. Everything coming from WooCommerce
// is validated with zod: a malformed or tampered response is rejected instead of reaching the pages.
import { z } from "zod";

// WooCommerce sends numbers as strings in many fields ("12.00"), and "" when empty.
const money = z.union([z.string(), z.number()]).transform((v) => String(v));
const meta = z.object({ key: z.string(), value: z.unknown() });
const https = z.string().url().refine((u) => u.startsWith("https://") || u.startsWith("http://localhost"), "https only");

export const wcProduct = z.object({
  id: z.number().int().positive(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1).max(300),
  status: z.string(),
  sku: z.string().default(""),
  price: money.default(""),
  regular_price: money.default(""),
  sale_price: money.default(""),
  on_sale: z.boolean().default(false),
  stock_status: z.enum(["instock", "outofstock", "onbackorder"]).default("instock"),
  manage_stock: z.boolean().default(false),
  stock_quantity: z.number().int().nullable().default(null),
  images: z.array(z.object({ src: https, alt: z.string().default("") })).max(40).default([]),
  categories: z.array(z.object({ slug: z.string() })).default([]),
  meta_data: z.array(meta).default([]),
});
export const wcProductList = z.array(wcProduct).max(500);
export type WcProduct = z.infer<typeof wcProduct>;

/** The list itself must be an array; its items are validated one by one (parseProductList). */
export const wcRawList = z.array(z.unknown()).max(500);

/**
 * One malformed product must not empty the whole shop: it is skipped and logged (id and failing fields only), and everything else stays
 * strictly validated. At checkout a skipped product is simply "unavailable", so it can never be bought with unchecked data.
 */
export function parseProductList(raw: unknown[], warn: (message: string) => void = console.warn): WcProduct[] {
  return raw.flatMap((item) => {
    const p = wcProduct.safeParse(item);
    if (p.success) return [p.data];
    const id = (item as { id?: unknown } | null)?.id;
    warn(`woo: skipped invalid product ${typeof id === "number" ? id : "(no id)"}: ${[...new Set(p.error.issues.map((i) => i.path.join(".")))].join(", ")}`);
    return [];
  });
}

export const wcZoneList = z.array(z.object({ id: z.number().int() })).max(100);
export const wcMethodList = z.array(z.object({ enabled: z.boolean() })).max(100);

export const wcOrderStatus = z.object({ id: z.number().int().positive(), number: z.string(), status: z.string(), order_key: z.string() });
export type WcOrderStatus = z.infer<typeof wcOrderStatus>;

// needs_setup is optional: not every WooCommerce version sends it.
export const wcGatewayList = z.array(z.object({ id: z.string(), enabled: z.boolean(), needs_setup: z.boolean().optional() })).max(100);
