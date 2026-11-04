import { z } from "zod";
import { wooEnabled, wooPaymentReady, wooShippingReady } from "@/lib/woo";
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
  addressAtCheckout: boolean; // WooCommerce: address, IVA and shipping cost are settled on its own checkout, so the cart does not show a shipping amount
};

/** Checkout is only offered when EVERYTHING is really configured; otherwise the shop says so honestly. */
export async function shopReadiness(fresh = false): Promise<ShopReadiness> {
  if (wooEnabled()) { // payments, stock, shipping and orders are WooCommerce's; the web only needs to know a sale can be completed there
    const [shipping, gateway] = await Promise.all([wooShippingReady(fresh), wooPaymentReady(fresh)]);
    // The checklist has no WooCommerce rows yet, so these fields report the WooCommerce equivalent: stripe = a gateway is ready; webhook and siteUrl = configured
    // here (whether WordPress really calls the webhook cannot be checked from this side). Only the gateway and shipping block checkout.
    return {
      settings: { enabled: true, currency: "EUR", zones: [] }, database: true, stripe: gateway, server: true,
      webhook: Boolean(process.env.WC_WEBHOOK_SECRET),
      siteUrl: Boolean(process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://")),
      shipping, canCheckout: shipping && gateway, addressAtCheckout: true,
    };
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
  return { ...r, addressAtCheckout: false, canCheckout: settings.enabled && r.database && r.stripe && r.server && r.webhook && r.siteUrl && r.shipping };
}
