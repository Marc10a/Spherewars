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
      const { error } = await sb.rpc("release_order_stock", { p_session: session });
      if (error) throw error;
    },
    async refundByPaymentIntent(pi) {
      const { data, error } = await sb.from("orders").update({ status: "refunded" }).eq("stripe_payment_intent", pi).in("status", ["paid", "shipped"]).select("id");
      if (error) throw error;
      if (data?.length) return;
      // Stripe does not guarantee order: the refund may arrive before the payment confirmation. Ask for a retry instead of losing it.
      const { data: sessions } = await new Stripe(key).checkout.sessions.list({ payment_intent: pi, limit: 1 });
      const session = sessions[0]?.id;
      if (!session) return; // a charge that is not one of our orders
      const { data: pending } = await sb.from("orders").select("id").eq("stripe_session_id", session).eq("status", "pending").maybeSingle();
      if (pending) throw new Error(`refund arrived before payment confirmation: ${pending.id}`);
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
