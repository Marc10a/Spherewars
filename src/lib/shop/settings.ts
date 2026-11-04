import { z } from "zod";
import { wooEnabled, wooShipping } from "@/lib/woo";
import { isConfigured, supabaseServer } from "@/lib/supabase/server";
import { hasServiceRole } from "@/lib/supabase/admin";
import type { ShopSettings } from "@/lib/shop/pricing";

const zoneSchema = z.object({
  id: z.string().min(1).max(40),
  label: z.string().trim().min(1).max(80),
  countries: z.array(z.string().regex(/^[A-Z]{2}$/)).min(1).max(250),
  price_cents: z.number().int().min(0).max(100_000),
  free_over_cents: z.number().int().min(1).nullable(),
});
export const shopSettingsSchema = z.object({
  enabled: z.boolean(),
  currency: z.literal("EUR"),
  zones: z.array(zoneSchema).max(6),
});

export const defaultShopSettings: ShopSettings = { enabled: false, currency: "EUR", zones: [] };

export function parseShopSettings(raw: unknown): ShopSettings {
  const p = shopSettingsSchema.safeParse(raw);
  return p.success ? p.data : defaultShopSettings;
}

/** Shop configuration saved by the admin (site_settings.shop). Public by design: it holds no secrets. */
export async function getShopSettings(): Promise<ShopSettings> {
  if (!isConfigured()) return defaultShopSettings;
  const sb = await supabaseServer();
  const { data } = await sb.from("site_settings").select("value").eq("key", "shop").maybeSingle();
  return parseShopSettings(data?.value);
}

export type ShopReadiness = {
  settings: ShopSettings;
  database: boolean;   // Supabase connected
  stripe: boolean;     // STRIPE_SECRET_KEY present
  server: boolean;     // service role key present (needed to create orders / receive payments)
  webhook: boolean;    // STRIPE_WEBHOOK_SECRET present (needed to confirm payments)
  siteUrl: boolean;    // NEXT_PUBLIC_SITE_URL present (Stripe must return customers to the real domain)
  shipping: boolean;   // at least one shipping zone configured
  canCheckout: boolean;
};

/** Checkout is only offered when EVERYTHING is really configured; otherwise the shop says so honestly. */
export async function shopReadiness(): Promise<ShopReadiness> {
  if (wooEnabled()) { // payments, stock and orders are WooCommerce's; the cart only needs its shipping zones
    const settings = (await wooShipping())?.settings ?? defaultShopSettings;
    const shipping = settings.zones.length > 0;
    return { settings, database: true, stripe: true, server: true, webhook: true, siteUrl: true, shipping, canCheckout: shipping };
  }
  const settings = await getShopSettings();
  const r = {
    settings,
    database: isConfigured(),
    stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    server: hasServiceRole(),
    webhook: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    siteUrl: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
    shipping: settings.zones.length > 0,
  };
  return { ...r, canCheckout: settings.enabled && r.database && r.stripe && r.server && r.webhook && r.siteUrl && r.shipping };
}
