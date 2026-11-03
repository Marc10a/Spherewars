import Stripe from "stripe";
import { supabaseAdmin, hasServiceRole } from "@/lib/supabase/admin";
import { processEvent, type OrderDb } from "@/lib/shop/webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe -> this endpoint (configure in Stripe Dashboard > Developers > Webhooks):
 *   https://YOUR-DOMAIN/api/stripe/webhook
 *   events: checkout.session.completed, checkout.session.async_payment_succeeded,
 *           checkout.session.async_payment_failed, checkout.session.expired, charge.refunded
 * The signature is verified with STRIPE_WEBHOOK_SECRET, so only Stripe can confirm a payment.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!secret || !key || !hasServiceRole()) return new Response("Payments not configured", { status: 503 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = new Stripe(key).webhooks.constructEvent(await req.text(), signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const sb = supabaseAdmin();
  const db: OrderDb = {
    async markPaid(d) {
      const { data, error } = await sb.rpc("mark_order_paid", {
        p_session: d.session, p_payment_intent: d.paymentIntent, p_email: d.email, p_name: d.name,
        p_phone: d.phone, p_address: d.address, p_country: d.country,
      });
      if (error) throw error;
      return (data as string | null) ?? null;
    },
    async cancelBySession(session) {
      const { error } = await sb.from("orders").update({ status: "cancelled" }).eq("stripe_session_id", session).eq("status", "pending");
      if (error) throw error;
    },
    async refundByPaymentIntent(pi) {
      const { error } = await sb.from("orders").update({ status: "refunded" }).eq("stripe_payment_intent", pi).in("status", ["paid", "shipped"]);
      if (error) throw error;
    },
  };

  try {
    const result = await processEvent(event as unknown as Parameters<typeof processEvent>[0], db);
    return Response.json({ received: true, ...result });
  } catch (e) {
    console.error("stripe webhook failed", event.type, e);
    return new Response("Processing error", { status: 500 }); // Stripe retries automatically
  }
}
