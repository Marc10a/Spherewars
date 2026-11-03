// Subset of the WooCommerce REST API v3 (/wp-json/wc/v3) that the shop reads and writes. Everything coming from WooCommerce
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
  stock_status: z.enum(["instock", "outofstock", "onbackorder"]).default("instock"),
  manage_stock: z.boolean().default(false),
  stock_quantity: z.number().int().nullable().default(null),
  images: z.array(z.object({ src: https, alt: z.string().default("") })).max(40).default([]),
  categories: z.array(z.object({ slug: z.string() })).default([]),
  meta_data: z.array(meta).default([]),
});
export const wcProductList = z.array(wcProduct).max(500);
export type WcProduct = z.infer<typeof wcProduct>;

const setting = z.object({ value: z.union([z.string(), z.number()]).transform((v) => String(v)) }).partial().optional();
export const wcZone = z.object({ id: z.number().int(), name: z.string() });
export const wcZoneList = z.array(wcZone).max(50);
export const wcLocationList = z.array(z.object({ code: z.string(), type: z.string() })).max(500);
export const wcMethodList = z.array(z.object({
  instance_id: z.number().int(),
  title: z.string().default(""),
  enabled: z.boolean(),
  method_id: z.string(),
  settings: z.object({ cost: setting, min_amount: setting, requires: setting }).partial().default({}),
})).max(50);
export type WcMethod = z.infer<typeof wcMethodList>[number];

export const wcOrderCreated = z.object({ id: z.number().int().positive(), payment_url: https });
