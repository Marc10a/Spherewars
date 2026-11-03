// Tests for the WooCommerce layer: contract, mapping, shipping zones, client, order body and webhook signature.
// Run: npm run test:woo   (Node 22.6+ for .ts imports; no network and no WooCommerce needed)
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { wcProductList, wcMethodList, wcOrderCreated } from "../src/lib/woo/contract.ts";
import { wcGet, wcPost, wcUrl } from "../src/lib/woo/client.ts";
import { orderBody, shippingLineFor, toCents, toCostCents, toProduct, toSettings, toZone } from "../src/lib/woo/map.ts";
import { verifyWooSignature } from "../src/lib/woo/webhook.ts";
import { computeCart } from "../src/lib/shop/pricing.ts";

let pass = 0;
const t = async (name, fn) => { await fn(); pass++; console.log("ok  ", name); };
const FACTIONS = ["alianza", "manadas-de-urueh", "vastagos-de-kurgan", "adeptos-de-malesur"];
const base = { id: 11, slug: "satanor", name: "Satanor", status: "publish", price: "15.00", stock_status: "instock", images: [{ src: "https://cms.x.es/wp-content/uploads/a.jpg", alt: "" }], categories: [{ slug: "manadas-de-urueh" }] };
const opts = (fetchImpl) => ({ baseUrl: "https://cms.x.es", key: "ck", secret: "cs", fetchImpl });
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

await t("prices: strict decimal parsing; empty, text and zero are not buyable", () => {
  assert.equal(toCents("15.00"), 1500); assert.equal(toCents("18.5"), 1850); assert.equal(toCents("0.10"), 10);
  for (const v of ["", "abc", "0", "0.00", "-5", "1,50", "12.5€", null, undefined]) assert.equal(toCents(v), null, String(v));
  assert.equal(toCostCents("0"), 0); assert.equal(toCostCents("5,5"), 550); assert.equal(toCostCents("5 + [qty]"), null);
});

await t("contract: valid products parse; http images, bad slugs and bad stock status are rejected", () => {
  assert.equal(wcProductList.parse([base]).length, 1);
  const bad = (p) => assert.equal(wcProductList.safeParse([{ ...base, ...p }]).success, false);
  bad({ images: [{ src: "http://evil.example/x.jpg" }] }); bad({ images: [{ src: "javascript:alert(1)" }] });
  bad({ slug: "Mal Slug" }); bad({ stock_status: "maybe" }); bad({ id: -1 });
  assert.equal(wcOrderCreated.safeParse({ id: 1, payment_url: "javascript:alert(1)" }).success, false);
});

await t("product mapping: price, stock, faction, wiki link and sellable flag", () => {
  const p = toProduct(wcProductList.parse([{ ...base, manage_stock: true, stock_quantity: 5, meta_data: [{ key: "sw_wiki_slug", value: "personajes/mandas-de-urueh/satanor" }] }])[0], FACTIONS);
  assert.deepEqual([p.id, p.price_cents, p.stock, p.sellable, p.wiki_slug, p.factions?.slug], ["11", 1500, 5, true, "personajes/mandas-de-urueh/satanor", "manadas-de-urueh"]);
  const out = toProduct(wcProductList.parse([{ ...base, stock_status: "outofstock" }])[0], FACTIONS);
  assert.equal(out.stock, 0);
  const noPrice = toProduct(wcProductList.parse([{ ...base, price: "" }])[0], FACTIONS);
  assert.equal(noPrice.sellable, false); assert.equal(noPrice.price_cents, null);
  const draft = toProduct(wcProductList.parse([{ ...base, status: "draft" }])[0], FACTIONS);
  assert.equal(draft.sellable, false);
  const evilMeta = toProduct(wcProductList.parse([{ ...base, meta_data: [{ key: "sw_wiki_slug", value: "../../etc" }] }])[0], FACTIONS);
  assert.equal(evilMeta.wiki_slug, null);
});

await t("shipping zones: flat rate, free over X, free always; formulas and incomplete zones are skipped", () => {
  const m = (o) => wcMethodList.parse([{ instance_id: 1, title: "T", enabled: true, ...o }]);
  const flat = toZone(1, "España", ["ES"], m({ method_id: "flat_rate", settings: { cost: { value: "5.00" } } }));
  assert.deepEqual([flat.zone.price_cents, flat.zone.free_over_cents], [500, null]);
  const both = toZone(1, "ES", ["ES"], [...m({ method_id: "flat_rate", settings: { cost: { value: "5" } } }), ...wcMethodList.parse([{ instance_id: 2, enabled: true, method_id: "free_shipping", settings: { requires: { value: "min_amount" }, min_amount: { value: "50" } } }])]);
  assert.deepEqual([both.zone.price_cents, both.zone.free_over_cents], [500, 5000]);
  const always = toZone(1, "ES", ["ES"], m({ method_id: "free_shipping", settings: {} }));
  assert.equal(always.zone.price_cents, 0);
  assert.equal(toZone(1, "FR", ["FR"], m({ method_id: "flat_rate", settings: { cost: { value: "5 + [qty]" } } })), null);
  assert.equal(toZone(1, "FR", ["FR"], m({ method_id: "free_shipping", settings: { requires: { value: "min_amount" }, min_amount: { value: "50" } } })), null);
  assert.equal(toZone(1, "x", [], m({ method_id: "flat_rate", settings: { cost: { value: "5" } } })), null);
  assert.equal(toZone(1, "x", ["ES"], wcMethodList.parse([{ instance_id: 1, enabled: false, method_id: "flat_rate", settings: { cost: { value: "5" } } }])), null);
  assert.equal(toSettings([flat]).enabled, true); assert.equal(toSettings([]).enabled, false);
});

await t("cart rules work on WooCommerce data (stock, availability, shipping, free threshold)", () => {
  const prods = wcProductList.parse([{ ...base, manage_stock: true, stock_quantity: 2 }, { ...base, id: 12, slug: "b", price: "" }]).map((p) => toProduct(p, FACTIONS));
  const map = new Map(prods.map((p) => [p.id, { id: p.id, name: p.name, sku: null, price_cents: p.price_cents, currency: "EUR", stock: p.stock, sellable: p.sellable }]));
  const zone = toZone(1, "ES", ["ES"], wcMethodList.parse([{ instance_id: 1, enabled: true, method_id: "flat_rate", settings: { cost: { value: "5" } } }]));
  const settings = toSettings([zone]);
  const ok = computeCart([{ id: "11", qty: 2 }], map, settings, "ES");
  assert.equal(ok.ok, true); assert.equal(ok.total_cents, 3500);
  assert.equal(computeCart([{ id: "11", qty: 3 }], map, settings, "ES").error, "out_of_stock");
  assert.equal(computeCart([{ id: "12", qty: 1 }], map, settings, "ES").error, "unavailable");
  assert.equal(computeCart([{ id: "11", qty: 1 }], map, settings, "FR").error, "no_zone");
});

await t("order body: ids and quantities only (no prices), country and the shipping line", () => {
  const zone = toZone(1, "ES", ["ES"], wcMethodList.parse([{ instance_id: 7, title: "Estándar", enabled: true, method_id: "flat_rate", settings: { cost: { value: "5" } } }]));
  const body = orderBody([{ id: "11", qty: 2 }], "ES", shippingLineFor(zone, 500));
  assert.deepEqual(body.line_items, [{ product_id: 11, quantity: 2 }]);
  assert.equal(body.set_paid, false); assert.equal(body.status, "pending");
  assert.deepEqual(body.shipping_lines[0], { method_id: "flat_rate", instance_id: "7", method_title: "Estándar", total: "5.00" });
  assert.ok(!JSON.stringify(body.line_items).includes("price") && !JSON.stringify(body.line_items).includes("total"));
});

await t("client: Basic auth, namespaced URL, validated data; null on errors and timeouts", async () => {
  assert.equal(wcUrl("https://cms.x.es/", "products", { include: "1,2", per_page: 100, x: undefined }), "https://cms.x.es/wp-json/wc/v3/products?include=1%2C2&per_page=100");
  let seen;
  const r = await wcGet("products", wcProductList, opts(async (_u, init) => { seen = init; return json([base]); }));
  assert.equal(r.length, 1); assert.equal(seen.headers.Authorization, `Basic ${Buffer.from("ck:cs").toString("base64")}`);
  const run = (f) => wcGet("products", wcProductList, opts(f));
  assert.equal(await run(async () => json({ code: "x" }, 401)), null);
  assert.equal(await run(async () => json([{ nope: 1 }])), null);
  assert.equal(await run(async () => { throw new Error("ECONNREFUSED"); }), null);
  const slow = (_u, init) => new Promise((_r, rej) => init.signal.addEventListener("abort", () => rej(new Error("aborted"))));
  const t0 = Date.now();
  assert.equal(await wcGet("products", wcProductList, { ...opts(slow), timeoutMs: 150 }), null);
  assert.ok(Date.now() - t0 < 1500);
});

await t("client: orders are POSTed without cache and the response is validated", async () => {
  let seen;
  const r = await wcPost("orders", wcOrderCreated, opts(async (_u, init) => { seen = init; return json({ id: 5, payment_url: "https://cms.x.es/pay/5" }, 201); }), { a: 1 });
  assert.equal(r.id, 5); assert.equal(seen.method, "POST"); assert.equal(seen.cache, "no-store"); assert.equal(seen.body, '{"a":1}');
  assert.equal(await wcPost("orders", wcOrderCreated, opts(async () => json({ id: 5 }, 201)), {}), null);
});

await t("webhook signature: valid passes; tampered body, wrong secret, missing values never do", () => {
  const body = '{"id":11,"status":"publish"}', secret = "s3cret";
  const sig = createHmac("sha256", secret).update(body).digest("base64");
  assert.equal(verifyWooSignature(body, sig, secret), true);
  assert.equal(verifyWooSignature(body + " ", sig, secret), false);
  assert.equal(verifyWooSignature(body, sig, "other"), false);
  assert.equal(verifyWooSignature(body, null, secret), false);
  assert.equal(verifyWooSignature(body, sig, undefined), false);
  assert.equal(verifyWooSignature(body, "!!!", secret), false);
});

console.log(`\n${pass} tests passed`);
