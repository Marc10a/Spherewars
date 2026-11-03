// Payment webhook logic, separated from the HTTP route and from Stripe's SDK so it can be tested with plain objects.

export type PaidDetails = {
  session: string; paymentIntent: string | null; email: string | null; name: string | null; phone: string | null;
  address: Record<string, unknown> | null; country: string | null;
};
export type OrderDb = {
  markPaid(d: PaidDetails): Promise<string | null>;
  cancelBySession(session: string): Promise<void>;
  refundByPaymentIntent(paymentIntent: string): Promise<void>;
};
// Minimal shape of the Stripe objects we read (typed loosely on purpose: Stripe moves fields between API versions).
type AnyObj = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
export type StripeEventLike = { type: string; data: { object: AnyObj } };

export function extractPaid(s: AnyObj): PaidDetails {
  const cust = s.customer_details ?? {};
  // API versions differ: shipping lives in `collected_information.shipping_details` (new) or `shipping_details` (old).
  const ship = s.collected_information?.shipping_details ?? s.shipping_details ?? null;
  const address = (ship?.address ?? cust.address ?? null) as Record<string, unknown> | null;
  return {
    session: s.id,
    paymentIntent: typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id ?? null,
    email: cust.email ?? null,
    name: ship?.name ?? cust.name ?? null,
    phone: cust.phone ?? null,
    address,
    country: (address?.country as string | undefined) ?? null,
  };
}

export async function processEvent(event: StripeEventLike, db: OrderDb): Promise<{ handled: boolean; detail: string }> {
  const o = event.data.object;
  switch (event.type) {
    case "checkout.session.completed":
      // Card payments are `paid` immediately. Delayed methods (bank debit...) arrive later as async_payment_succeeded.
      if (o.payment_status !== "paid") return { handled: false, detail: "waiting for async payment" };
      return { handled: true, detail: (await db.markPaid(extractPaid(o))) ? "order paid" : "already processed" };
    case "checkout.session.async_payment_succeeded":
      return { handled: true, detail: (await db.markPaid(extractPaid(o))) ? "order paid" : "already processed" };
    case "checkout.session.expired":
    case "checkout.session.async_payment_failed":
      await db.cancelBySession(o.id);
      return { handled: true, detail: "order cancelled" };
    case "charge.refunded": {
      const pi = typeof o.payment_intent === "string" ? o.payment_intent : o.payment_intent?.id;
      if (pi && o.refunded === true) { await db.refundByPaymentIntent(pi); return { handled: true, detail: "order refunded" }; }
      return { handled: false, detail: "partial refund ignored" };
    }
    default:
      return { handled: false, detail: `ignored ${event.type}` };
  }
}
