"use server";

import Stripe from "stripe";
import { redirect } from "next/navigation";
import { z } from "zod";
import { dict, fmt } from "@/lib/i18n";
import { siteUrl } from "@/lib/seo";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { shopReadiness } from "@/lib/shop/settings";
import { computeCart, type ShopProduct } from "@/lib/shop/pricing";
import { wooCreateOrder, wooEnabled, wooProductsById, wooShipping } from "@/lib/woo";

const form = z.object({
  locale: z.enum(["es", "en", "ca"]),
  country: z.string().regex(/^[A-Z]{2}$/),
  cart: z.string().max(10_000),
});
const cartSchema = z.array(z.object({ id: z.string().uuid(), qty: z.number().int() })).max(60);
const STRIPE_LOCALE = { es: "es", en: "en", ca: "auto" } as const;

/**
 * Creates the pending order and the Stripe Checkout Session, then sends the customer to Stripe.
 * Security: the browser sends only product ids + quantities + country. Prices, stock, availability and shipping
 * are ALL re-read from the database here; nothing the client says about money is trusted.
 */
export async function startCheckout(formData: FormData) {
  const parsed = form.safeParse(Object.fromEntries(formData));
  const locale = parsed.success ? parsed.data.locale : "es";
  const back = (code: string): never => redirect(`/${locale}/tienda/carrito?e=${code}`);
  if (!parsed.success) return back("generic");

  const ready = await shopReadiness();
  if (!ready.canCheckout) return back("disabled");

  if (wooEnabled()) return startWooCheckout(parsed.data.cart, parsed.data.country, back);

  let cart;
  try { cart = cartSchema.parse(JSON.parse(parsed.data.cart)); } catch { return back("generic"); }

  const sb = supabaseAdmin();
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

  const result = computeCart(cart, products, ready.settings, parsed.data.country);
  if (!result.ok) return back(result.error);

  // 1) pending order (the webhook flips it to "paid" once Stripe confirms the payment)
  const { data: order, error: orderError } = await sb
    .from("orders")
    .insert({
      status: "pending", currency: ready.settings.currency, locale,
      subtotal_cents: result.subtotal_cents, shipping_cents: result.shipping_cents, total_cents: result.total_cents,
      shipping_country: parsed.data.country,
    })
    .select("id")
    .single();
  if (orderError || !order) return back("generic");

  const { error: itemsError } = await sb.from("order_items").insert(
    result.lines.map((l) => ({ order_id: order.id, product_id: l.product.id, name: l.product.name, sku: l.product.sku, unit_price_cents: l.unit_cents, qty: l.qty })),
  );
  if (itemsError) { await sb.from("orders").delete().eq("id", order.id); return back("generic"); }

  // 2) Stripe Checkout Session
  let url: string | null = null;
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const currency = ready.settings.currency.toLowerCase();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      locale: STRIPE_LOCALE[locale],
      client_reference_id: order.id,
      metadata: { order_id: order.id, locale },
      line_items: result.lines.map((l) => ({
        quantity: l.qty,
        price_data: {
          currency, unit_amount: l.unit_cents,
          product_data: { name: l.product.name, ...(images.get(l.product.id) ? { images: [images.get(l.product.id)!] } : {}) },
        },
      })),
      shipping_address_collection: { allowed_countries: [parsed.data.country as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry] },
      shipping_options: [{ shipping_rate_data: { type: "fixed_amount", fixed_amount: { amount: result.shipping_cents, currency }, display_name: result.zone.label } }],
      phone_number_collection: { enabled: true },
      custom_text: { submit: { message: fmt(dict[locale].shop.stripeNote, { url: `${siteUrl}/${locale}/legal/condiciones` }) } },
      // Prices are final consumer prices (VAT included). Set STRIPE_AUTOMATIC_TAX=1 only if Stripe Tax is configured.
      ...(process.env.STRIPE_AUTOMATIC_TAX === "1" ? { automatic_tax: { enabled: true } } : {}),
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60, // frees the reservation if the customer abandons
      success_url: `${siteUrl}/${locale}/tienda/gracias?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/${locale}/tienda/carrito?e=cancelled`,
    });
    url = session.url;
    await sb.from("orders").update({ stripe_session_id: session.id }).eq("id", order.id);
  } catch (e) {
    console.error("stripe checkout failed", e);
    await sb.from("orders").delete().eq("id", order.id);
    return back("stripe");
  }
  if (!url) return back("stripe");
  redirect(url);
}

/**
 * WooCommerce checkout: products and shipping are read AGAIN from WooCommerce (the browser only sends ids, quantities and country),
 * the same cart rules are applied, a pending order is created in WooCommerce and the customer pays on WooCommerce's payment page.
 */
async function startWooCheckout(rawCart: string, country: string, back: (code: string) => never): Promise<never> {
  let cart;
  try { cart = z.array(z.object({ id: z.string().regex(/^[0-9]{1,12}$/), qty: z.number().int() })).max(60).parse(JSON.parse(rawCart)); } catch { return back("generic"); }

  const [products, shipping] = await Promise.all([wooProductsById([...new Set(cart.map((c) => c.id))]), wooShipping(true)]);
  if (!products || !shipping) return back("generic");
  const map = new Map<string, ShopProduct>(products.map((p) => [p.id, { id: p.id, name: p.name, sku: null, price_cents: p.price_cents, currency: p.currency, stock: p.stock, sellable: p.sellable }]));

  const result = computeCart(cart, map, shipping.settings, country);
  if (!result.ok) return back(result.error);
  const detail = shipping.details.find((d) => d.zone.id === result.zone.id);
  if (!detail) return back("no_zone");

  const url = await wooCreateOrder(result.lines.map((l) => ({ id: l.product.id, qty: l.qty })), country, detail, result.shipping_cents);
  if (!url) return back("stripe");
  redirect(url);
}
