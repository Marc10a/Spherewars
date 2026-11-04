// Tests for the WooCommerce layer: contract, mapping, shipping zones, client, order body and webhook signature.
// The second half runs the real src/lib/woo against the simulator (scripts/mock-wc.mjs), which this script starts on a free port.
// Run: npm run test:woo   (Node 22.15+ for .ts imports and module hooks; no internet and no WooCommerce needed)
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHmac } from "node:crypto";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

// Same module resolution as the app: the "@/" alias, imports without extension, and next/* subpaths.
const SRC = fileURLToPath(new URL("../src/", import.meta.url));
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "next/cache") return next(`${specifier}.js`, context);
    // Request-time APIs only exist inside Next: stand-ins that let the real startCheckout server action run here.
    if (specifier === "next/headers") return { url: `data:text/javascript,export const headers = async () => globalThis.__request.headers; export const cookies = async () => globalThis.__request.cookies;`, shortCircuit: true };
    if (specifier === "next/navigation") return { url: `data:text/javascript,export const redirect = (url) => { throw { redirectedTo: url }; }; export const notFound = () => { throw new Error("notFound"); };`, shortCircuit: true };
    const fromApp = specifier.startsWith("@/") ? SRC + specifier.slice(2) : specifier.startsWith("./") && context.parentURL?.includes("/src/") ? fileURLToPath(new URL(specifier, context.parentURL)) : null;
    if (fromApp) for (const f of [fromApp, `${fromApp}.ts`, `${fromApp}.tsx`, `${fromApp}/index.ts`]) if (existsSync(f) && /\.tsx?$/.test(f)) return next(pathToFileURL(f).href, context);
    return next(specifier, context);
  },
});

const { wcProductList, wcMethodList, wcOrderCreated, wcOrderList, parseProductList } = await import("../src/lib/woo/contract.ts");
const { wcGet, wcPost, wcUrl, wcWrite } = await import("../src/lib/woo/client.ts");
const { attemptLimiter, browserCookieOptions, cartErrorPath, checkoutKey, clientIpFrom, clientIpSource, findExistingOrder, hasUsableGateway, orderBody, orderLimit, orderReturnState, parseBrowserId, resolveZones, visitorOf, returnUrlFor, shippingLineFor, toCents, toCostCents, toProduct, toSettings, toZone, META_CLIENT, META_KEY, META_NETWORK, MAX_OPEN_PER_CLIENT, MAX_OPEN_PER_NETWORK, PRESSURE_OPEN_ORDERS } = await import("../src/lib/woo/map.ts");
const { isWooPing, verifyWooSignature } = await import("../src/lib/woo/webhook.ts");
const { computeCart } = await import("../src/lib/shop/pricing.ts");
const { productForMiniature } = await import("../src/lib/shop/match.ts");

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

// ---- launch gaps, pure logic ----------------------------------------------------------------------------------------------------
const product = (o) => toProduct(wcProductList.parse([{ ...base, ...o }])[0], FACTIONS);
const metaOf = (v) => ({ meta_data: [{ key: "sw_wiki_slug", value: v }] });

await t("packs: packs/<faction> maps as a pack; unknown factions and path tricks do not", () => {
  const pack = product({ categories: [], ...metaOf("packs/alianza") });
  assert.deepEqual([pack.wiki_slug, pack.category, pack.factions?.slug, pack.sellable], ["packs/alianza", "pack", "alianza", true]);
  for (const bad of ["packs/otra", "packs/", "packs/../alianza", "packs/alianza/x"]) assert.equal(product(metaOf(bad)).wiki_slug, null, bad);
  assert.equal(product(metaOf("personajes/alianza/rodanes")).category, "miniature");
});

await t("packs: found through the explicit link; a product whose slug is a faction is not a pack", () => {
  const link = { id: "1", slug: "defensores-de-caldara", wiki_slug: "packs/alianza" };
  assert.equal(productForMiniature([link], "packs/alianza")?.id, "1");
  assert.equal(productForMiniature([{ id: "2", slug: "alianza", wiki_slug: null }], "packs/alianza"), undefined);
});

await t("alias: postulante-raso finds the corazon-postulante product, by link or slug, and both ways", () => {
  const raso = "personajes/alianza/postulante-raso", corazon = "personajes/alianza/corazon-postulante";
  assert.equal(productForMiniature([{ id: "1", slug: "cohorte", wiki_slug: corazon }], raso)?.id, "1");
  assert.equal(productForMiniature([{ id: "1", slug: "cohorte", wiki_slug: raso }], corazon)?.id, "1");
  assert.equal(productForMiniature([{ id: "1", slug: "corazon-postulante", wiki_slug: null }], raso)?.id, "1");
  assert.equal(productForMiniature([{ id: "9", slug: "c", wiki_slug: corazon }, { id: "1", slug: "r", wiki_slug: raso }], raso)?.id, "1"); // an exact link wins
  assert.equal(productForMiniature([{ id: "1", slug: "cohorte", wiki_slug: corazon }], "personajes/alianza/rodanes"), undefined);
});

await t("catalogue: one invalid product is skipped and logged without values; valid ones stay; bad money and ids stay rejected", () => {
  const logs = [];
  const ok = parseProductList([base, { ...base, id: 12, slug: "Mal Slug", name: "secreto-en-valor" }, { ...base, id: "13" }, { ...base, id: 14, price: { a: 1 } }, null, { ...base, id: 15, slug: "bien" }], (m) => logs.push(m));
  assert.deepEqual(ok.map((p) => p.id), [11, 15]);
  assert.equal(logs.length, 4); assert.match(logs[0], /12: slug/); assert.ok(!logs.join().includes("secreto-en-valor"));
  assert.equal(product({ price: "abc" }).sellable, false);
});

await t("sale: regular and sale prices exposed; charged price unchanged; no sale unless active and lower", () => {
  const on = product({ price: "12.00", regular_price: "16.99", sale_price: "12.00", on_sale: true });
  assert.deepEqual([on.price_cents, on.regular_price_cents, on.sale_price_cents], [1200, 1699, 1200]);
  const scheduled = product({ price: "16.99", regular_price: "16.99", sale_price: "12.00", on_sale: false });
  assert.deepEqual([scheduled.price_cents, scheduled.sale_price_cents], [1699, null]);
  assert.equal(product({ price: "20.00", regular_price: "16.99", on_sale: true }).sale_price_cents, null);
});

const flatRate = (cost = "5") => wcMethodList.parse([{ instance_id: 1, title: "T", enabled: true, method_id: "flat_rate", settings: { cost: { value: cost } } }]);
const zoneIn = (id, locations, methods = flatRate()) => ({ id, name: `Z${id}`, locations, methods });
const loc = (code, type = "country") => ({ code, type });
const EU = { EU: ["ES", "FR", "PT"] };

await t("zones: continents become countries; first zone wins, as in WooCommerce", () => {
  const r = resolveZones([zoneIn(1, [loc("ES")], flatRate("5")), zoneIn(2, [loc("EU", "continent")], flatRate("12"))], EU);
  assert.deepEqual(r.map((d) => [d.zone.countries, d.zone.price_cents]), [[["ES"], 500], [["FR", "PT"], 1200]]);
});

await t("zones: a state rule (Canaries) closes that country at every rate; other countries go on", () => {
  const r = resolveZones([zoneIn(1, [loc("ES"), loc("PT")]), zoneIn(2, [loc("ES:TF", "state"), loc("ES:GC", "state")], flatRate("20"))], {});
  assert.deepEqual(r.flatMap((d) => d.zone.countries), ["PT"]);
  assert.deepEqual(resolveZones([zoneIn(1, [loc("ES:M", "state")])], {}), []);
});

await t("zones: postcode rules and unknown location types close the zone and its countries", () => {
  assert.deepEqual(resolveZones([zoneIn(1, [loc("ES"), loc("35*", "postcode")]), zoneIn(2, [loc("ES"), loc("FR")])], {}).flatMap((d) => d.zone.countries), ["FR"]);
  assert.deepEqual(resolveZones([zoneIn(1, [loc("ES"), loc("x", "galaxy")])], {}), []);
});

await t("zones: a country in a zone that cannot be charged exactly never falls through to a later zone", () => {
  const r = resolveZones([zoneIn(1, [loc("FR")], flatRate("5 + [qty]")), zoneIn(2, [loc("EU", "continent")])], EU);
  assert.deepEqual(r.flatMap((d) => d.zone.countries), ["ES", "PT"]);
  assert.deepEqual(resolveZones([zoneIn(1, [loc("EU", "continent")])], {}), []); // continent list unavailable: nothing is assumed
});

await t("gateways: an enabled gateway is required; needs_setup and an empty list do not count", () => {
  assert.equal(hasUsableGateway([{ enabled: false }, { enabled: true }]), true);
  assert.equal(hasUsableGateway([{ enabled: true, needs_setup: false }]), true);
  assert.equal(hasUsableGateway([{ enabled: true, needs_setup: true }]), false);
  assert.equal(hasUsableGateway([{ enabled: false }]), false);
  assert.equal(hasUsableGateway([]), false);
});

await t("webhook ping: only the exact unsigned body is a ping; a signature or any other body is not", () => {
  assert.equal(isWooPing("webhook_id=12", null), true);
  assert.equal(isWooPing("webhook_id=12", "bad"), false);
  assert.equal(isWooPing("webhook_id=12", ""), false);
  for (const b of ['{"id":1}', "", "webhook_id=", "webhook_id=1&price=0", "webhook_id=abc", "webhook_id=1\n"]) assert.equal(isWooPing(b, null), false, b);
});

await t("rate limit: 20 per hour per visitor, independent visitors, resets; a full table forgets the oldest and never refuses newcomers", () => {
  const allow = attemptLimiter();
  for (let i = 0; i < 20; i++) assert.equal(allow("a", 1000), true);
  assert.equal(allow("a", 1000), false); assert.equal(allow("b", 1000), true);
  assert.equal(allow("a", 1000 + 3600e3), true);
  const small = attemptLimiter(1, 3600e3, 2);
  assert.equal(small("a", 0), true); assert.equal(small("b", 1), true);
  assert.equal(small("newcomer", 2), true); // table full: still allowed
  assert.equal(small("b", 3), false); assert.equal(small("newcomer", 4), false); // recent entries keep their limit
});

await t("client IP: only the trusted source counts; faked headers are ignored; production without a source closes", () => {
  const h = (o) => (n) => o[n] ?? null;
  assert.equal(clientIpSource({ NODE_ENV: "production" }), null);
  assert.equal(clientIpSource({ NODE_ENV: "development" }), "local");
  assert.deepEqual(clientIpSource({ VERCEL: "1", NODE_ENV: "production" }), { header: "x-vercel-forwarded-for", hops: 1 });
  assert.deepEqual(clientIpSource({ WC_CLIENT_IP_HEADER: "CF-Connecting-IP", NODE_ENV: "production" }), { header: "cf-connecting-ip", hops: 1 });
  for (const bad of [{ WC_CLIENT_IP_HEADER: "bad header" }, { WC_CLIENT_IP_HEADER: "x-forwarded-for", WC_TRUSTED_PROXY_HOPS: "0" }, { WC_CLIENT_IP_HEADER: "x-forwarded-for", WC_TRUSTED_PROXY_HOPS: "x" }]) assert.equal(clientIpSource({ VERCEL: "1", ...bad }), null);
  const vercel = clientIpSource({ VERCEL: "1" });
  assert.equal(clientIpFrom(h({ "x-vercel-forwarded-for": "9.9.9.9", "x-real-ip": "1.1.1.1", "x-forwarded-for": "2.2.2.2" }), vercel), "9.9.9.9");
  assert.equal(clientIpFrom(h({ "x-real-ip": "1.1.1.1" }), vercel), null);
  const xff = { header: "x-forwarded-for", hops: 1 };
  assert.equal(clientIpFrom(h({ "x-forwarded-for": "6.6.6.6, 7.7.7.7" }), xff), "7.7.7.7"); // the client wrote 6.6.6.6; the proxy added 7.7.7.7
  assert.equal(clientIpFrom(h({ "x-forwarded-for": "6.6.6.6, 7.7.7.7, 8.8.8.8" }), { ...xff, hops: 2 }), "7.7.7.7");
  assert.equal(clientIpFrom(h({ "x-forwarded-for": "7.7.7.7" }), { ...xff, hops: 2 }), null);
  assert.equal(clientIpFrom(h({ "x-forwarded-for": "not-an-ip" }), xff), null);
  assert.equal(clientIpFrom(h({}), null), null);
});

await t("visitors: IPv6 buckets by /64 and network by /48; IPv4 by address and /24; the IP is not stored", () => {
  const v = (ip) => visitorOf("s", ip);
  assert.equal(v("2001:db8:1:2:aaaa::1").client, v("2001:db8:1:2:bbbb:cccc:dddd:eeee").client);
  assert.equal(v("2001:0DB8:0001:0002::1").client, v("2001:db8:1:2::9").client);
  assert.notEqual(v("2001:db8:1:2::1").client, v("2001:db8:1:3::1").client);
  assert.equal(v("2001:db8:1:2::1").network, v("2001:db8:1:ffff::1").network);
  assert.notEqual(v("2001:db8:1::1").network, v("2001:db8:2::1").network);
  assert.notEqual(v("1.2.3.4").client, v("1.2.3.5").client);
  assert.equal(v("1.2.3.4").network, v("1.2.3.5").network);
  assert.notEqual(v("1.2.3.4").network, v("1.2.4.4").network);
  assert.equal(v("::ffff:1.2.3.4").client, v("1.2.3.4").client); assert.equal(v("::ffff:102:304").client, v("1.2.3.4").client);
  assert.equal(v("fe80::1%eth0").client, v("fe80::2").client);
  assert.ok(!JSON.stringify(v("1.2.3.4")).includes("1.2.3"));
  assert.notEqual(visitorOf("other", "1.2.3.4").client, v("1.2.3.4").client);
});

await t("browser id: only a well-formed id is accepted; the cookie is HttpOnly, Lax, and Secure in production", () => {
  assert.equal(parseBrowserId("6f1e2c3a-0000-4000-8000-000000000000"), "6f1e2c3a-0000-4000-8000-000000000000");
  for (const bad of [undefined, "", "x", "6F1E2C3A-0000-4000-8000-000000000000", "6f1e2c3a-0000-4000-8000-000000000000;x"]) assert.equal(parseBrowserId(bad), null, bad);
  const prod = browserCookieOptions(true);
  assert.deepEqual([prod.httpOnly, prod.secure, prod.sameSite, prod.path], [true, true, "lax", "/"]);
  assert.equal(browserCookieOptions(false).secure, false);
});

await t("idempotency key: stable for the same checkout; changes with browser, visitor, lines, prices, destination and shipping", () => {
  const l = [{ id: "1", qty: 1, unit_cents: 100 }, { id: "2", qty: 2, unit_cents: 200 }];
  const k = checkoutKey("s", "b", "c", l, "ES", 500);
  assert.equal(k, checkoutKey("s", "b", "c", [...l].reverse(), "ES", 500));
  for (const other of [checkoutKey("s", "b2", "c", l, "ES", 500), checkoutKey("s", "b", "x", l, "ES", 500), checkoutKey("s", "b", "c", [{ ...l[0], qty: 2 }, l[1]], "ES", 500), checkoutKey("s", "b", "c", [{ ...l[0], unit_cents: 99 }, l[1]], "ES", 500), checkoutKey("s", "b", "c", l, "FR", 500), checkoutKey("s", "b", "c", l, "ES", 0), checkoutKey("z", "b", "c", l, "ES", 500)]) assert.notEqual(other, k);
});

await t("order limits: per visitor and network; under pressure they tighten but a new visitor still gets through", () => {
  const now = Date.parse("2026-11-04T12:00:00Z");
  const row = (o = {}, c = "c", n = "n") => wcOrderList.parse([{ id: 1, status: "pending", date_created_gmt: "2026-11-04T11:30:00", payment_url: "https://cms.x.es/pay", meta_data: [{ key: META_KEY, value: "k" }, { key: META_CLIENT, value: c }, { key: META_NETWORK, value: n }], ...o }])[0];
  assert.equal(findExistingOrder([row()], "k", now)?.id, 1);
  assert.equal(findExistingOrder([row()], "other", now), undefined);
  assert.equal(findExistingOrder([row({ status: "processing" })], "k", now), undefined);
  assert.equal(findExistingOrder([row({ needs_payment: false })], "k", now), undefined);
  assert.equal(findExistingOrder([row({ date_created_gmt: "2026-11-04T10:30:00" })], "k", now), undefined);
  const me = { client: "c", network: "n" }, fresh = { client: "new", network: "new" };
  const many = (n, c, net) => Array.from({ length: n }, (_, i) => row({}, c ?? `c${i}`, net ?? `n${i}`));
  assert.equal(orderLimit(many(MAX_OPEN_PER_CLIENT - 1, "c", "n"), me, now).over, false);
  assert.equal(orderLimit(many(MAX_OPEN_PER_CLIENT, "c", "n"), me, now).over, true);
  assert.equal(orderLimit(many(MAX_OPEN_PER_CLIENT, "c", "n"), fresh, now).over, false);
  assert.equal(orderLimit(many(MAX_OPEN_PER_NETWORK, undefined, "n"), { client: "c", network: "n" }, now).over, true); // rotating addresses inside one block
  const flood = many(PRESSURE_OPEN_ORDERS);
  assert.deepEqual(orderLimit(flood, fresh, now), { over: false, pressure: true }); // no site-wide lockout
  assert.equal(orderLimit([...flood, row({}, "c", "n")], me, now).over, true);
  assert.equal(orderLimit([...many(PRESSURE_OPEN_ORDERS - 3), ...many(3, undefined, "n")], { client: "x", network: "n" }, now).over, true);
  assert.deepEqual(orderLimit(Array.from({ length: 100 }, () => row({ meta_data: [] })), fresh, now), { over: false, pressure: true }); // a full page counts as pressure
  assert.equal(orderLimit(Array.from({ length: 99 }, () => row({ meta_data: [] })), me, now).pressure, false); // orders made in WordPress do not count
});

await t("client: a write tells a clear rejection from an unknown outcome", async () => {
  const run = (f) => wcWrite("orders", wcOrderCreated, opts(f), {});
  assert.deepEqual(await run(async () => json({ code: "x" }, 400)), { ok: false, ambiguous: false });
  assert.deepEqual(await run(async () => json({ code: "x" }, 502)), { ok: false, ambiguous: true });
  assert.deepEqual(await run(async () => json({ id: 5 }, 201)), { ok: false, ambiguous: true });
  assert.deepEqual(await run(async () => { throw new Error("aborted"); }), { ok: false, ambiguous: true });
  assert.equal((await run(async () => json({ id: 5, payment_url: "https://cms.x.es/p" }, 201))).ok, true);
});

await t("return route: only https site URLs; order state needs the right key; only processing/completed count as paid", () => {
  assert.equal(returnUrlFor("https://x.es/", "ca"), "https://x.es/ca/tienda/gracias");
  assert.equal(returnUrlFor("http://localhost:3000", "es"), null); assert.equal(returnUrlFor(undefined, "es"), null);
  const o = (status) => ({ id: 1, number: "1", status, order_key: "wc_order_abc" });
  assert.equal(orderReturnState(o("processing"), "wc_order_abd"), null);
  assert.equal(orderReturnState(o("processing"), "x"), null);
  assert.equal(orderReturnState(o("processing"), "wc_order_abc").paid, true);
  assert.equal(orderReturnState(o("completed"), "wc_order_abc").paid, true);
  for (const s of ["pending", "on-hold", "failed", "cancelled"]) assert.equal(orderReturnState(o(s), "wc_order_abc").paid, false, s);
});

await t("cart error: ?e= stays as it was; &line= is added only for a numeric product id", () => {
  assert.equal(cartErrorPath("es", "busy"), "/es/tienda/carrito?e=busy");
  assert.equal(cartErrorPath("ca", "out_of_stock", "123"), "/ca/tienda/carrito?e=out_of_stock&line=123");
  for (const bad of ["1&x=2", "<script>", "../1", "", "1234567890123", "6f1e2c3a-0000-4000-8000-000000000000"]) assert.equal(cartErrorPath("es", "unavailable", bad), "/es/tienda/carrito?e=unavailable", bad);
});

// ---- the real src/lib/woo against the simulator -----------------------------------------------------------------------------------
const port = await new Promise((done) => { const s = createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => done(p)); }); });
const HOST = `http://localhost:${port}`;
const sim = spawn(process.execPath, [fileURLToPath(new URL("./mock-wc.mjs", import.meta.url))], { env: { PATH: process.env.PATH, PORT: String(port), MOCK_WC_KEY: "ck_sim", MOCK_WC_SECRET: "cs_sim" }, stdio: ["ignore", "pipe", "inherit"] });
await new Promise((done) => sim.stdout.once("data", done));
sim.stdout.resume();
process.on("exit", () => sim.kill());

// Test values only: the simulator's own credentials, never the project's.
Object.assign(process.env, { WC_API_URL: HOST, WC_CONSUMER_KEY: "ck_sim", WC_CONSUMER_SECRET: "cs_sim", WC_WEBHOOK_SECRET: "whs_sim" });
for (const k of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]) delete process.env[k];
const silenced = console.warn; console.warn = () => {};
const woo = await import("../src/lib/woo/index.ts");
const { shopReadiness } = await import("../src/lib/shop/settings.ts");
const { POST: webhookPOST } = await import("../src/app/api/woo/webhook/route.ts");

const control = (c) => fetch(`${HOST}/_control`, { method: "POST", body: JSON.stringify(c) });
const simOrders = async () => (await fetch(`${HOST}/_orders`)).json();
const checkout = async (o = {}) => {
  const detail = o.detail ?? (await woo.wooShipping(true)).details[0];
  return woo.wooCreateOrder({ lines: [{ id: "12", qty: 1, unit_cents: 1850 }], country: "ES", detail, shipping_cents: 500, visitor: { client: "visitor", network: "net" }, browser: "browser-1", returnUrl: "https://x.es/es/tienda/gracias", recheckMs: 20, ...o });
};

await t("simulator: the catalogue survives an invalid product and includes the pack and the sale", async () => {
  const ps = await woo.wooProducts();
  assert.ok(ps.length >= 6); assert.ok(!ps.some((p) => p.id === "17"));
  assert.equal(productForMiniature(ps, "packs/alianza")?.id, "15");
  const alias = productForMiniature(ps, "personajes/alianza/postulante-raso");
  assert.deepEqual([alias?.id, alias?.price_cents, alias?.regular_price_cents, alias?.sale_price_cents], ["16", 1200, 1699, 1200]);
  assert.deepEqual((await woo.wooProductsById(["17", "12"])).map((p) => p.id), ["12"]); // at checkout, the invalid one is just unavailable
});

await t("simulator: EU continent zone, formula zone stays closed, zone 0 ignored", async () => {
  await control({ reset: true });
  const { settings } = await woo.wooShipping(true);
  assert.deepEqual(settings.zones.map((z) => [z.label, z.countries]), [["España", ["ES"]], ["Europa", ["PT", "DE", "IT"]]]);
  await control({ set: { continents: {} } }); // continent list unreadable: closed, not guessed
  assert.equal(await woo.wooShipping(true), null);
  await control({ reset: true });
});

await t("simulator: readiness needs zones AND a gateway; unreadable gateways fail closed", async () => {
  await control({ reset: true });
  assert.equal((await shopReadiness()).canCheckout, true);
  await control({ set: { gateways: [{ id: "bacs", enabled: false }] } });
  assert.equal((await shopReadiness()).canCheckout, false);
  await control({ set: { gateways: [] } });
  assert.equal((await shopReadiness()).canCheckout, false);
  await control({ set: { gateways: null } }); // the key may not read gateways: 403
  const r = await shopReadiness();
  assert.equal(r.canCheckout, false); assert.equal(r.stripe, false); assert.equal(r.shipping, true);
  await control({ reset: true, set: { zones: [] } });
  assert.equal((await shopReadiness()).canCheckout, false);
  await control({ reset: true });
});

await t("simulator: a retry reuses the order; a paid or changed one does not", async () => {
  await control({ reset: true });
  const a = await checkout(), b = await checkout();
  assert.ok(a.url.includes("/order-pay/1001/")); assert.equal(b.url, a.url);
  assert.equal((await simOrders()).length, 1);
  await checkout({ lines: [{ id: "12", qty: 2, unit_cents: 1850 }] });
  assert.equal((await simOrders()).length, 2);
  await control({ payOrder: 1001 });
  assert.ok((await checkout()).url.includes("/order-pay/1003/")); // the first one is paid: this is a new purchase
});

await t("simulator: the order carries only ids, country and the return route; no prices", async () => {
  await control({ reset: true });
  await checkout();
  const [o] = await simOrders();
  assert.deepEqual(o.line_items, [{ product_id: 12, quantity: 1 }]);
  assert.equal(o.meta_data.find((m) => m.key === "sw_return_url").value, "https://x.es/es/tienda/gracias");
  assert.deepEqual(o.meta_data.map((m) => m.key).sort(), ["sw_checkout_key", "sw_client", "sw_network", "sw_return_url"]);
  assert.ok(!o.meta_data.some((m) => /\d+\.\d+\.\d+\.\d+/.test(String(m.value))));
});

await t("simulator: a timeout after WooCommerce saved the order does not duplicate it", async () => {
  await control({ reset: true, hangNextOrder: true });
  const r = await checkout({ timeoutMs: 150 });
  assert.ok(r.url?.includes("/order-pay/1001/"), JSON.stringify(r)); // found by its key while answering this same request
  assert.equal((await simOrders()).length, 1);
  assert.equal((await checkout()).url, r.url);
  assert.equal((await simOrders()).length, 1);
});

await t("simulator: an old unpaid order is not reused; unreadable orders mean nothing is created", async () => {
  await control({ reset: true });
  await checkout();
  await control({ ageOrders: 2 * 3600e3 });
  assert.ok((await checkout()).url.includes("/1002/"));
  const detail = (await woo.wooShipping(true)).details[0];
  await control({ set: { ordersDown: true } });
  assert.deepEqual(await checkout({ detail, lines: [{ id: "12", qty: 3, unit_cents: 1850 }] }), { error: "failed" });
  assert.equal((await simOrders()).length, 2);
});

await t("simulator: too many unpaid orders from one visitor means busy, and no order is created", async () => {
  await control({ reset: true });
  for (let q = 1; q <= MAX_OPEN_PER_CLIENT; q++) assert.ok((await checkout({ lines: [{ id: "12", qty: q, unit_cents: 1850 }] })).url);
  assert.deepEqual(await checkout({ lines: [{ id: "12", qty: 9, unit_cents: 1850 }] }), { error: "busy" });
  assert.equal((await simOrders()).length, MAX_OPEN_PER_CLIENT);
  assert.ok((await checkout({ visitor: { client: "someone-else", network: "other" } })).url);
});

await t("simulator: the return is confirmed by reading the order, never by the URL", async () => {
  await control({ reset: true });
  await checkout();
  const [o] = await simOrders();
  assert.equal((await woo.wooOrderReturn("1001", o.order_key)).paid, false);
  await control({ payOrder: 1001 });
  assert.equal((await woo.wooOrderReturn("1001", o.order_key)).paid, true);
  assert.equal(await woo.wooOrderReturn("1001", "wc_order_wrong"), null);
  assert.equal(await woo.wooOrderReturn("1001", "../x"), null);
  assert.equal(await woo.wooOrderReturn("1/../2", o.order_key), null);
  assert.equal(await woo.wooOrderReturn("9999", "wc_order_abc"), null);
});

const { startCheckout } = await import("../src/app/[locale]/tienda/actions.ts");
const browser = () => {
  const jar = new Map(), set = [];
  return { set, cookies: { get: (n) => (jar.has(n) ? { value: jar.get(n) } : undefined), set: (n, v, o) => { jar.set(n, v); set.push([n, v, o]); } } };
};
const buy = async (b, requestHeaders, country = "ES", cart = [{ id: "12", qty: 1 }]) => {
  globalThis.__request = { headers: new Headers(requestHeaders), cookies: b.cookies };
  const f = new FormData();
  f.set("locale", "es"); f.set("country", country); f.set("cart", JSON.stringify(cart));
  try { await startCheckout(f); } catch (e) { if (e?.redirectedTo) return e.redirectedTo; throw e; }
  throw new Error("startCheckout did not redirect");
};
const withEnv = async (env, fn) => {
  const saved = Object.fromEntries(Object.keys(env).map((k) => [k, process.env[k]]));
  Object.assign(process.env, env);
  try { await fn(); } finally { for (const [k, v] of Object.entries(saved)) if (v === undefined) delete process.env[k]; else process.env[k] = v; }
};
const silently = async (fn) => { const e = console.error; const logged = []; console.error = (m) => logged.push(String(m)); try { await fn(logged); } finally { console.error = e; } };
const onVercel = { VERCEL: "1", NODE_ENV: "production" };

await t("server action: two browsers behind one IP never share an order; the same browser reuses its own", () => withEnv(onVercel, async () => {
  await control({ reset: true });
  const ip = { "x-vercel-forwarded-for": "203.0.113.1" };
  const a = browser(), b = browser();
  const urlA = await buy(a, ip), urlB = await buy(b, ip);
  assert.ok(urlA.includes("/order-pay/1001/")); assert.ok(urlB.includes("/order-pay/1002/"));
  assert.equal(await buy(a, ip), urlA);
  assert.equal((await simOrders()).length, 2);
  assert.equal(a.set.length, 1); // set once, then kept
  const [name, , options] = a.set[0];
  assert.equal(name, "sw_checkout");
  assert.deepEqual([options.httpOnly, options.secure, options.sameSite], [true, true, "lax"]);
}));

await t("server action: rotating a faked x-real-ip or x-forwarded-for does not escape the limits", () => withEnv(onVercel, async () => {
  await control({ reset: true });
  const b = browser();
  const urls = [];
  for (let q = 1; q <= MAX_OPEN_PER_CLIENT + 1; q++) urls.push(await buy(b, { "x-vercel-forwarded-for": "203.0.113.2", "x-real-ip": `10.0.0.${q}`, "x-forwarded-for": `10.1.0.${q}` }, "ES", [{ id: "12", qty: q }]));
  assert.equal(urls.at(-1), "/es/tienda/carrito?e=busy");
  assert.equal((await simOrders()).length, MAX_OPEN_PER_CLIENT);
}));

await t("server action: production without a trusted IP source closes checkout, and says so in the readiness", () => withEnv({ NODE_ENV: "production" }, async () => {
  await control({ reset: true });
  assert.equal(await buy(browser(), { "x-real-ip": "1.1.1.1" }), "/es/tienda/carrito?e=disabled");
  const r = await shopReadiness();
  assert.deepEqual([r.canCheckout, r.server], [false, false]);
  assert.equal((await simOrders()).length, 0);
}));

await t("server action: a flood of unpaid orders alerts but does not lock out a new customer", () => withEnv(onVercel, () => silently(async (logged) => {
  await control({ reset: true });
  for (let i = 0; i < PRESSURE_OPEN_ORDERS; i++) await checkout({ visitor: { client: `attacker-${i}`, network: `net-${i}` }, browser: `b${i}` });
  const customer = browser();
  assert.ok((await buy(customer, { "x-vercel-forwarded-for": "198.51.100.7" })).includes("/order-pay/"));
  assert.ok(logged.some((m) => m.includes("ALERT")));
  assert.equal(await buy(customer, { "x-vercel-forwarded-for": "198.51.100.7" }, "ES", [{ id: "12", qty: 2 }]), "/es/tienda/carrito?e=busy"); // tighter allowance per visitor
  assert.ok((await buy(browser(), { "x-vercel-forwarded-for": "198.51.100.8" })).includes("/order-pay/")); // another address in the block still buys
})));

await t("server action: errors name the failed line with &line=", () => withEnv(onVercel, async () => {
  await control({ reset: true });
  assert.equal(await buy(browser(), { "x-vercel-forwarded-for": "192.0.2.9" }, "ES", [{ id: "13", qty: 1 }]), "/es/tienda/carrito?e=out_of_stock&line=13");
  assert.equal(await buy(browser(), { "x-vercel-forwarded-for": "192.0.2.9" }, "ES", [{ id: "17", qty: 1 }]), "/es/tienda/carrito?e=unavailable&line=17");
}));

await t("readiness: the webhook and site URL rows tell the truth and do not block a sale", () => withEnv({ NEXT_PUBLIC_SITE_URL: "http://localhost:3000", WC_WEBHOOK_SECRET: "" }, async () => {
  await control({ reset: true });
  const r = await shopReadiness();
  assert.deepEqual([r.webhook, r.siteUrl, r.canCheckout], [false, false, true]);
  await withEnv({ NEXT_PUBLIC_SITE_URL: "https://x.es", WC_WEBHOOK_SECRET: "whs_sim" }, async () => {
    const ok = await shopReadiness();
    assert.deepEqual([ok.webhook, ok.siteUrl], [true, true]);
  });
}));

await t("webhook route: ping 200; unsigned or badly signed real events 401, also with a ping-shaped body", async () => {
  const post = (body, signature) => webhookPOST(new Request("http://x/api/woo/webhook", { method: "POST", body, headers: signature === undefined ? {} : { "x-wc-webhook-signature": signature } }));
  assert.equal((await post("webhook_id=7")).status, 200);
  assert.equal((await post('{"id":11}')).status, 401);
  assert.equal((await post('{"id":11}', "bad")).status, 401);
  assert.equal((await post("webhook_id=7", "bad")).status, 401);
  const saved = process.env.WC_WEBHOOK_SECRET; delete process.env.WC_WEBHOOK_SECRET;
  assert.equal((await post("webhook_id=7")).status, 503);
  process.env.WC_WEBHOOK_SECRET = saved;
});

console.warn = silenced;
sim.kill();
console.log(`\n${pass} tests passed`);
