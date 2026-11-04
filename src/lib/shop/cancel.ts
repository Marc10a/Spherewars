import Stripe from "stripe";
import { hasServiceRole, supabaseAdmin } from "@/lib/supabase/admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The customer came back from Stripe without paying. Closes the session and frees the reservation.
 * The order id is unguessable and this only ever touches pending orders; a session already completed is left alone.
 */
export async function cancelAbandonedCheckout(orderId: string) {
  if (!UUID.test(orderId) || !hasServiceRole() || !process.env.STRIPE_SECRET_KEY) return;
  try {
    const sb = supabaseAdmin();
    const { data: order } = await sb.from("orders").select("stripe_session_id, status").eq("id", orderId).maybeSingle();
    if (!order || order.status !== "pending" || !order.stripe_session_id) return;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { timeout: 10_000, maxNetworkRetries: 1 });
    const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
    if (session.status === "complete") return;
    if (session.status === "open") await stripe.checkout.sessions.expire(order.stripe_session_id);
    await sb.rpc("release_order_stock", { p_order: orderId });
  } catch (e) {
    console.error("abandoned checkout cleanup failed", orderId, e); // the sweep on a later checkout still frees it
  }
}
