// Tests for the shop logic (no network, no database). Run: npm run test:shop  (needs Node 22.6+ for .ts imports)
import assert from "node:assert/strict";
import Stripe from "stripe";
import { computeCart, shippableCountries, zoneFor } from "../src/lib/shop/pricing.ts";
import { processEvent, extractPaid } from "../src/lib/shop/webhook.ts";

let pass = 0;
const t = async (name, fn) => { await fn(); pass++; console.log("ok  ", name); };

const prod = (id, o = {}) => ({ id, name: id, sku: null, price_cents: 1500, currency: "EUR", stock: 10, sellable: true, ...o });
const products = new Map([
  ["a", prod("a")], ["b", prod("b", { price_cents: 2000, stock: null })], ["low", prod("low", { stock: 2 })],
  ["noprice", prod("noprice", { price_cents: null })], ["off", prod("off", { sellable: false })],
]);
const settings = {
  enabled: true, currency: "EUR",
  zones: [
    { id: "es", label: "España", countries: ["ES"], price_cents: 495, free_over_cents: 6000 },
    { id: "eu", label: "Europa", countries: ["FR", "PT", "DE"], price_cents: 990, free_over_cents: null },
  ],
};

// ---- pricing -------------------------------------------------------------
await t("totals: subtotal + shipping", () => {
  const r = computeCart([{ id: "a", qty: 2 }, { id: "b", qty: 1 }], products, settings, "ES");
  assert.ok(r.ok); assert.equal(r.subtotal_cents, 5000); assert.equal(r.shipping_cents, 495); assert.equal(r.total_cents, 5495);
});
await t("free shipping at the threshold", () => {
  const r = computeCart([{ id: "b", qty: 3 }], products, settings, "ES"); // 6000
  assert.ok(r.ok); assert.equal(r.shipping_cents, 0); assert.equal(r.total_cents, 6000);
});
await t("zone without free threshold always charges", () => {
  const r = computeCart([{ id: "b", qty: 10 }], products, settings, "FR");
  assert.ok(r.ok); assert.equal(r.shipping_cents, 990);
});
await t("duplicate lines are merged", () => {
  const r = computeCart([{ id: "a", qty: 1 }, { id: "a", qty: 2 }], products, settings, "ES");
  assert.ok(r.ok); assert.equal(r.lines.length, 1); assert.equal(r.lines[0].qty, 3);
});
await t("unknown product rejected", () => assert.deepEqual(computeCart([{ id: "zzz", qty: 1 }], products, settings, "ES"), { ok: false, error: "unavailable", productId: "zzz" }));
await t("product without price can never be bought", () => assert.equal(computeCart([{ id: "noprice", qty: 1 }], products, settings, "ES").error, "unavailable"));
await t("non-sellable product rejected", () => assert.equal(computeCart([{ id: "off", qty: 1 }], products, settings, "ES").error, "unavailable"));
await t("stock limit enforced (also across merged lines)", () => {
  assert.equal(computeCart([{ id: "low", qty: 3 }], products, settings, "ES").error, "out_of_stock");
  assert.equal(computeCart([{ id: "low", qty: 1 }, { id: "low", qty: 2 }], products, settings, "ES").error, "out_of_stock");
  assert.ok(computeCart([{ id: "low", qty: 2 }], products, settings, "ES").ok);
});
await t("bad quantities rejected (0, negative, fractional, huge)", () => {
  for (const qty of [0, -1, 1.5, 21, NaN]) assert.equal(computeCart([{ id: "a", qty }], products, settings, "ES").error, "bad_qty");
});
await t("empty cart / too many lines / bad country / country without a zone", () => {
  assert.equal(computeCart([], products, settings, "ES").error, "empty");
  assert.equal(computeCart(Array.from({ length: 31 }, () => ({ id: "a", qty: 1 })), products, settings, "ES").error, "too_many");
  assert.equal(computeCart([{ id: "a", qty: 1 }], products, settings, "es").error, "bad_country");
  assert.equal(computeCart([{ id: "a", qty: 1 }], products, settings, "US").error, "no_zone");
});
await t("client-supplied prices cannot matter: computeCart ignores them", () => {
  const r = computeCart([{ id: "a", qty: 1, price_cents: 1 }], products, settings, "ES");
  assert.ok(r.ok); assert.equal(r.subtotal_cents, 1500);
});
await t("helpers", () => {
  assert.deepEqual(shippableCountries(settings), ["DE", "ES", "FR", "PT"]);
  assert.equal(zoneFor(settings, "PT").id, "eu"); assert.equal(zoneFor(settings, "US"), null);
});

// ---- miniature <-> product matching --------------------------------------
import { productForMiniature, extraProducts } from "../src/lib/shop/match.ts";
await t("match: explicit wiki_slug wins over slug convention", () => {
  const ps = [{ id: "1", slug: "satanor", wiki_slug: null }, { id: "2", slug: "otro", wiki_slug: "personajes/mandas-de-urueh/satanor" }];
  assert.equal(productForMiniature(ps, "personajes/mandas-de-urueh/satanor").id, "2");
});
await t("match: falls back to slug == last wiki segment, only when unlinked", () => {
  const ps = [{ id: "1", slug: "sull", wiki_slug: null }, { id: "2", slug: "nirlem", wiki_slug: "personajes/alianza/rodanes" }];
  assert.equal(productForMiniature(ps, "personajes/vastagos-de-kurgan/sull").id, "1");
  assert.equal(productForMiniature(ps, "personajes/alianza/nirlem"), undefined); // 'nirlem' is explicitly linked elsewhere
});
await t("match: no product -> undefined (shown as coming soon, no invented price)", () => {
  assert.equal(productForMiniature([], "personajes/alianza/laroc"), undefined);
});
await t("match: extras are the faction products not tied to a miniature", () => {
  const ps = [{ id: "1", slug: "satanor", wiki_slug: null }, { id: "2", slug: "starter-urueh", wiki_slug: null }];
  assert.deepEqual(extraProducts(ps, ["personajes/mandas-de-urueh/satanor", "personajes/mandas-de-urueh/igniis"]).map((p) => p.id), ["2"]);
});

// ---- webhook -------------------------------------------------------------
const calls = [];
const db = {
  async markPaid(d) { calls.push(["paid", d]); return calls.filter((c) => c[0] === "paid").length === 1 ? "order-1" : null; },
  async cancelBySession(s) { calls.push(["cancel", s]); },
  async refundByPaymentIntent(p) { calls.push(["refund", p]); },
};
const session = {
  id: "cs_1", payment_status: "paid", payment_intent: "pi_1",
  customer_details: { email: "c@e.com", name: "Cliente", phone: "600", address: { country: "ES" } },
  collected_information: { shipping_details: { name: "Cliente Envío", address: { country: "ES", city: "Madrid", line1: "Calle 1" } } },
};
await t("webhook: paid session marks order paid with shipping data", async () => {
  const r = await processEvent({ type: "checkout.session.completed", data: { object: session } }, db);
  assert.deepEqual([r.handled, r.detail], [true, "order paid"]);
  const d = calls.at(-1)[1];
  assert.equal(d.session, "cs_1"); assert.equal(d.paymentIntent, "pi_1"); assert.equal(d.email, "c@e.com");
  assert.equal(d.name, "Cliente Envío"); assert.equal(d.country, "ES"); assert.equal(d.address.city, "Madrid");
});
await t("webhook: redelivery is reported as already processed", async () => {
  const r = await processEvent({ type: "checkout.session.completed", data: { object: session } }, db);
  assert.equal(r.detail, "already processed");
});
await t("webhook: unpaid (async) session is NOT marked paid", async () => {
  const before = calls.length;
  const r = await processEvent({ type: "checkout.session.completed", data: { object: { ...session, payment_status: "unpaid" } } }, db);
  assert.equal(r.handled, false); assert.equal(calls.length, before);
});
await t("webhook: async success, expiry, failure, full refund", async () => {
  assert.equal((await processEvent({ type: "checkout.session.async_payment_succeeded", data: { object: session } }, db)).handled, true);
  await processEvent({ type: "checkout.session.expired", data: { object: { id: "cs_2" } } }, db);
  await processEvent({ type: "checkout.session.async_payment_failed", data: { object: { id: "cs_3" } } }, db);
  await processEvent({ type: "charge.refunded", data: { object: { payment_intent: "pi_9", refunded: true } } }, db);
  const kinds = calls.map((c) => c[0]);
  assert.ok(kinds.includes("cancel") && kinds.includes("refund"));
  assert.deepEqual(calls.filter((c) => c[0] === "cancel").map((c) => c[1]), ["cs_2", "cs_3"]);
});
await t("webhook: partial refund and unknown events are ignored", async () => {
  const before = calls.length;
  assert.equal((await processEvent({ type: "charge.refunded", data: { object: { payment_intent: "pi_8", refunded: false } } }, db)).handled, false);
  assert.equal((await processEvent({ type: "customer.created", data: { object: {} } }, db)).handled, false);
  assert.equal(calls.length, before);
});
await t("extractPaid falls back to the older shipping_details field", () => {
  const d = extractPaid({ id: "x", payment_intent: { id: "pi_obj" }, shipping_details: { name: "N", address: { country: "FR" } }, customer_details: {} });
  assert.equal(d.country, "FR"); assert.equal(d.paymentIntent, "pi_obj");
});

// ---- Stripe signature (real SDK): only correctly signed payloads are accepted --------------------
const stripe = new Stripe("sk_test_dummy");
const secret = "whsec_test_secret";
const payload = JSON.stringify({ id: "evt_1", object: "event", type: "checkout.session.completed", data: { object: { id: "cs_1" } } });
await t("signature: valid payload verifies", () => {
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
  assert.equal(stripe.webhooks.constructEvent(payload, header, secret).id, "evt_1");
});
await t("signature: tampered payload is rejected", () => {
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
  assert.throws(() => stripe.webhooks.constructEvent(payload.replace("cs_1", "cs_2"), header, secret));
});
await t("signature: wrong secret and missing header are rejected", () => {
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_other" });
  assert.throws(() => stripe.webhooks.constructEvent(payload, header, secret));
  assert.throws(() => stripe.webhooks.constructEvent(payload, "", secret));
});

console.log(`\n${pass} tests passed`);
