"use server";

import { createHash } from "node:crypto";
import Stripe from "stripe";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { dict, fmt } from "@/lib/i18n";
import { siteUrl } from "@/lib/seo";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { shopReadiness } from "@/lib/shop/settings";
import { checkLines, computeCart, type ShopProduct } from "@/lib/shop/pricing";
import { wooCheckoutUrl, wooEnabled, wooProductsById } from "@/lib/woo";
import { cartErrorPath } from "@/lib/woo/map";

const form = z.object({
  locale: z.enum(["es", "en", "ca"]),
  country: z.string().regex(/^[A-Z]{2}$/).optional(), // WooCommerce asks for the address on its own checkout
  cart: z.string().max(10_000),
});
const cartSchema = z.array(z.object({ id: z.string().uuid(), qty: z.number().int() })).max(60);
const STRIPE_LOCALE = { es: "es", en: "en", ca: "auto" } as const;
const MAX_OPEN_RESERVATIONS = 3;
const stripeClient = () => new Stripe(process.env.STRIPE_SECRET_KEY!, { timeout: 20_000, maxNetworkRetries: 1 });

async function clientHash() {
  const h = await headers();
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return createHash("sha256").update(`${ip}:${process.env.SUPABASE_SERVICE_ROLE_KEY}`).digest("hex");
}

/** Best-effort sweep, run on each checkout: frees reservations whose webhook never arrived or whose checkout died midway. */
async function releaseExpiredReservations(sb: ReturnType<typeof supabaseAdmin>) {
  const { data } = await sb.from("orders").select("id, stripe_session_id")
    .eq("status", "pending").eq("stock_reserved", true).lt("reserved_until", new Date().toISOString()).limit(20);
  for (const o of data ?? []) {
    try {
      if (o.stripe_session_id) {
        const stripe = stripeClient();
        const session = await stripe.checkout.sessions.retrieve(o.stripe_session_id);
        if (session.status === "complete") { // paid, or a delayed payment still in progress: the webhook decides
          await sb.from("orders").update({ reserved_until: null }).eq("id", o.id);
          continue;
        }
        if (session.status === "open") await stripe.checkout.sessions.expire(o.stripe_session_id);
      }
      await sb.rpc("release_order_stock", { p_order: o.id });
    } catch (e) {
      console.error("reservation sweep failed", o.id, e);
    }
  }
}

/**
 * Creates the pending order and the Stripe Checkout Session, then sends the customer to Stripe.
 * Security: the browser sends only product ids + quantities + country. Prices, stock, availability and shipping
 * are ALL re-read from the database here; nothing the client says about money is trusted.
 */
export async function startCheckout(formData: FormData) {
  const parsed = form.safeParse(Object.fromEntries(formData));
  const locale = parsed.success ? parsed.data.locale : "es";
  const back = (code: string, line?: string): never => redirect(cartErrorPath(locale, code, line));
  if (!parsed.success) return back("generic");

  const woo = wooEnabled();
  const ready = await shopReadiness(woo); // WooCommerce: read fresh, so a gateway that was just turned off is not offered
  if (!ready.canCheckout) return back("disabled");

  if (woo) return startWooCheckout(parsed.data.cart, locale, back);

  const country = parsed.data.country;
  if (!country) return back("bad_country");

  let cart;
  try { cart = cartSchema.parse(JSON.parse(parsed.data.cart)); } catch { return back("generic"); }

  const sb = supabaseAdmin();
  await releaseExpiredReservations(sb);

  // Stops one visitor from locking the whole shop by opening checkouts and never paying.
  const client = await clientHash();
  const { count: openReservations } = await sb.from("orders").select("id", { count: "exact", head: true })
    .eq("client_hash", client).eq("status", "pending").eq("stock_reserved", true).gt("reserved_until", new Date().toISOString());
  if ((openReservations ?? 0) >= MAX_OPEN_RESERVATIONS) return back("busy");

  const { data: rows } = await sb
    .from("products")
    .select("id, name, sku, price_cents, currency, stock, sellable, status, publish_at, image_path")
    .in("id", cart.map((c) => c.id));
  const now = Date.now();
  const products = new Map<string, ShopProduct>();
  const images = new Map<string, string>();
  for (const r of rows ?? []) {
    const live = r.status === "published" && (!r.publish_at || new Date(r.publish_at).getTime() <= now);
    products.set(r.id, { id: r.id, name: r.name, sku: r.sku, price_cents: r.price_cents, currency: r.currency, stock: r.stock, sellable: r.sellable && live });
    if (r.image_path) images.set(r.id, `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${r.image_path}`);
  }

  const result = computeCart(cart, products, ready.settings, country);
  if (!result.ok) return back(result.error);

  // 1) pending order (the webhook flips it to "paid" once Stripe confirms the payment)
  const { data: order, error: orderError } = await sb
    .from("orders")
    .insert({
      status: "pending", currency: ready.settings.currency, locale,
      subtotal_cents: result.subtotal_cents, shipping_cents: result.shipping_cents, total_cents: result.total_cents,
      shipping_country: country, client_hash: client,
    })
    .select("id")
    .single();
  if (orderError || !order) return back("generic");

  const { error: itemsError } = await sb.from("order_items").insert(
    result.lines.map((l) => ({ order_id: order.id, product_id: l.product.id, name: l.product.name, sku: l.product.sku, unit_price_cents: l.unit_cents, qty: l.qty })),
  );
  if (itemsError) { await sb.from("orders").delete().eq("id", order.id); return back("generic"); }

  // Reserve the stock now, atomically: the last unit cannot be sold twice while two customers are paying.
  const { data: reserved, error: reserveError } = await sb.rpc("reserve_order_stock", { p_order: order.id });
  if (reserveError || !reserved) {
    // After a lost response the reservation may have gone through: release first. If that fails too, the order stays for the sweep.
    const { error: undoError } = await sb.rpc("release_order_stock", { p_order: order.id });
    if (!undoError) await sb.from("orders").delete().eq("id", order.id);
    return back(reserveError ? "generic" : "out_of_stock");
  }

  // 2) Stripe Checkout Session
  let url: string | null = null;
  try {
    const stripe = stripeClient();
    const taxInclusive = process.env.STRIPE_AUTOMATIC_TAX === "1" ? { tax_behavior: "inclusive" as const } : {};
    const currency = ready.settings.currency.toLowerCase();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      locale: STRIPE_LOCALE[locale],
      client_reference_id: order.id,
      metadata: { order_id: order.id, locale },
      line_items: result.lines.map((l) => ({
        quantity: l.qty,
        price_data: {
          currency, unit_amount: l.unit_cents, ...taxInclusive,
          product_data: { name: l.product.name, ...(images.get(l.product.id) ? { images: [images.get(l.product.id)!] } : {}) },
        },
      })),
      shipping_address_collection: { allowed_countries: [country as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry] },
      shipping_options: [{ shipping_rate_data: { type: "fixed_amount", fixed_amount: { amount: result.shipping_cents, currency }, display_name: result.zone.label, ...taxInclusive } }],
      phone_number_collection: { enabled: true },
      custom_text: { submit: { message: fmt(dict[locale].shop.stripeNote, { url: `${siteUrl}/${locale}/legal/condiciones` }) } },
      // Prices are final consumer prices (VAT included). Set STRIPE_AUTOMATIC_TAX=1 only if Stripe Tax is configured.
      ...(process.env.STRIPE_AUTOMATIC_TAX === "1" ? { automatic_tax: { enabled: true } } : {}),
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60, // the webhook releases the reserved stock when the session expires
      success_url: `${siteUrl}/${locale}/tienda/gracias?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/${locale}/tienda/carrito?e=cancelled&o=${order.id}`,
    });
    url = session.url;
    // The webhook finds the order by this id. If it cannot be saved the customer must not reach Stripe: the payment could never be confirmed.
    const { error: linkError } = await sb.from("orders").update({ stripe_session_id: session.id }).eq("id", order.id);
    if (linkError) {
      await stripe.checkout.sessions.expire(session.id).catch(() => null);
      throw linkError;
    }
  } catch (e) {
    console.error("stripe checkout failed", e);
    const { error: releaseError } = await sb.rpc("release_order_stock", { p_order: order.id });
    if (releaseError) console.error("stock release failed", order.id, releaseError); // keep the order so the reservation stays traceable
    else await sb.from("orders").delete().eq("id", order.id);
    return back("stripe");
  }
  if (!url) return back("stripe");
  redirect(url);
}

/**
 * WooCommerce checkout: products are read AGAIN from WooCommerce (the browser only sends ids and quantities) so that a sold-out line is explained in the
 * cart, and the customer goes to WooCommerce's own checkout. It collects the address and email, charges its own prices, and creates the order when they buy.
 */
async function startWooCheckout(rawCart: string, locale: string, back: (code: string, line?: string) => never): Promise<never> {
  let cart;
  try { cart = z.array(z.object({ id: z.string().regex(/^[0-9]{1,12}$/), qty: z.number().int() })).max(60).parse(JSON.parse(rawCart)); } catch { return back("generic"); }

  const products = await wooProductsById([...new Set(cart.map((c) => c.id))]);
  if (!products) return back("generic");
  const map = new Map<string, ShopProduct>(products.map((p) => [p.id, { id: p.id, name: p.name, sku: null, price_cents: p.price_cents, currency: p.currency, stock: p.stock, sellable: p.sellable }]));

  const result = checkLines(cart, map);
  if (!result.ok) return back(result.error, result.productId);
  const url = wooCheckoutUrl(result.lines.map((l) => ({ id: l.product.id, qty: l.qty })), locale);
  if (!url) return back("generic");
  redirect(url);
}
