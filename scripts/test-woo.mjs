// Tests for the WooCommerce layer: contract, mapping, client, checkout link and webhook signature. Checkout itself is WooCommerce's: it is proven on a real one, not here (docs/WORDPRESS.md).
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
    if (specifier === "next/headers") return { url: `data:text/javascript,export const headers = async () => new Headers(); export const cookies = async () => ({ get: () => undefined });`, shortCircuit: true };
    if (specifier === "next/navigation") return { url: `data:text/javascript,export const redirect = (url) => { throw { redirectedTo: url }; }; export const notFound = () => { throw new Error("notFound"); };`, shortCircuit: true };
    const fromApp = specifier.startsWith("@/") ? SRC + specifier.slice(2) : specifier.startsWith("./") && context.parentURL?.includes("/src/") ? fileURLToPath(new URL(specifier, context.parentURL)) : null;
    if (fromApp) for (const f of [fromApp, `${fromApp}.ts`, `${fromApp}.tsx`, `${fromApp}/index.ts`]) if (existsSync(f) && /\.tsx?$/.test(f)) return next(pathToFileURL(f).href, context);
    return next(specifier, context);
  },
});

const { wcProductList, parseProductList } = await import("../src/lib/woo/contract.ts");
const { wcGet, wcUrl } = await import("../src/lib/woo/client.ts");
const { cartErrorPath, checkoutLink, hasUsableGateway, orderReturnState, toCents, toProduct } = await import("../src/lib/woo/map.ts");
const { isWooPing, verifyWooSignature } = await import("../src/lib/woo/webhook.ts");
const { checkLines } = await import("../src/lib/shop/pricing.ts");
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
});

await t("contract: valid products parse; http images, bad slugs and bad stock status are rejected", () => {
  assert.equal(wcProductList.parse([base]).length, 1);
  const bad = (p) => assert.equal(wcProductList.safeParse([{ ...base, ...p }]).success, false);
  bad({ images: [{ src: "http://evil.example/x.jpg" }] }); bad({ images: [{ src: "javascript:alert(1)" }] });
  bad({ slug: "Mal Slug" }); bad({ stock_status: "maybe" }); bad({ id: -1 });
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

await t("cart rules work on WooCommerce data (stock, availability, quantities)", () => {
  const prods = wcProductList.parse([{ ...base, manage_stock: true, stock_quantity: 2 }, { ...base, id: 12, slug: "b", price: "" }]).map((p) => toProduct(p, FACTIONS));
  const map = new Map(prods.map((p) => [p.id, { id: p.id, name: p.name, sku: null, price_cents: p.price_cents, currency: "EUR", stock: p.stock, sellable: p.sellable }]));
  const ok = checkLines([{ id: "11", qty: 2 }], map);
  assert.equal(ok.ok, true); assert.equal(ok.subtotal_cents, 3000);
  assert.equal(checkLines([{ id: "11", qty: 3 }], map).error, "out_of_stock");
  assert.equal(checkLines([{ id: "12", qty: 1 }], map).error, "unavailable");
  assert.equal(checkLines([], map).error, "empty");
  assert.equal(checkLines([{ id: "11", qty: 0 }], map).error, "bad_qty");
});

await t("money: no ,00 on whole euros, cents kept when there are any; shipping text comes from one place", async () => {
  const { formatMoney } = await import("../src/lib/shop/pricing.ts");
  const { shippingInfoText } = await import("../src/lib/shop/shipping-info.ts");
  const nb = (x) => x.replace(/\s/g, " ");
  assert.equal(nb(formatMoney(3900, "es")), "39 €"); assert.equal(nb(formatMoney(3990, "es")), "39,90 €"); assert.equal(formatMoney(3900, "en"), "€39");
  assert.equal(nb(shippingInfoText("{spain} {spainFree} {abroad} {abroadFree}", "es")), "5 € 50 € 15 € 100 €");
});

await t("checkout link: ids and quantities only, never a price; the language goes with it; a path in the base URL cannot move it", () => {
  assert.equal(checkoutLink("https://cms.x.es/", [{ id: "11", qty: 2 }, { id: "15", qty: 1 }], "ca"), "https://cms.x.es/checkout-link/?products=11:2,15:1&sw_lang=ca");
  assert.equal(checkoutLink("https://cms.x.es", [{ id: "11", qty: 1 }], "es"), "https://cms.x.es/checkout-link/?products=11:1&sw_lang=es");
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

await t("return: order state needs the right key; only processing/completed count as paid", () => {
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
const writes = async () => (await (await fetch(`${HOST}/_writes`)).json()).count;
await t("simulator: the catalogue survives an invalid product and includes the pack and the sale", async () => {
  const ps = await woo.wooProducts();
  assert.ok(ps.length >= 6); assert.ok(!ps.some((p) => p.id === "17"));
  assert.equal(productForMiniature(ps, "packs/alianza")?.id, "15");
  const alias = productForMiniature(ps, "personajes/alianza/postulante-raso");
  assert.deepEqual([alias?.id, alias?.price_cents, alias?.regular_price_cents, alias?.sale_price_cents], ["16", 1200, 1699, 1200]);
  assert.deepEqual((await woo.wooProductsById(["17", "12"])).map((p) => p.id), ["12"]); // at checkout, the invalid one is just unavailable
});

await t("simulator: readiness needs a shipping method AND a gateway; unreadable gateways fail closed", async () => {
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
  await control({ reset: true, set: { methods: { 1: [{ instance_id: 7, method_id: "flat_rate", enabled: false }] } } }); // a zone with its only method off cannot ship
  assert.equal((await shopReadiness()).canCheckout, false);
  await control({ reset: true, set: { methods: { 1: [{ instance_id: 7, method_id: "table_rate", enabled: true }] } } }); // any method: WooCommerce works out what it costs
  assert.equal((await shopReadiness()).canCheckout, true);
  await control({ reset: true });
});

await t("simulator: the return is confirmed by reading the order, never by the URL", async () => {
  await control({ reset: true, addOrder: true }); // WooCommerce's checkout would have created it
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
const buy = async (cart = [{ id: "12", qty: 1 }], locale = "es") => {
  const f = new FormData();
  f.set("locale", locale); f.set("cart", JSON.stringify(cart));
  try { await startCheckout(f); } catch (e) { if (e?.redirectedTo) return e.redirectedTo; throw e; }
  throw new Error("startCheckout did not redirect");
};
const withEnv = async (env, fn) => {
  const saved = Object.fromEntries(Object.keys(env).map((k) => [k, process.env[k]]));
  Object.assign(process.env, env);
  try { await fn(); } finally { for (const [k, v] of Object.entries(saved)) if (v === undefined) delete process.env[k]; else process.env[k] = v; }
};

await t("server action: goes to WooCommerce's checkout link; no order is created and nothing is written", async () => {
  await control({ reset: true });
  assert.equal(await buy([{ id: "12", qty: 2 }, { id: "15", qty: 1 }], "en"), `${HOST}/checkout-link/?products=12:2,15:1&sw_lang=en`);
  assert.equal((await simOrders()).length, 0);
  assert.equal(await writes(), 0);
});

await t("server action: errors name the failed line with &line=; bad carts never leave the web", async () => {
  await control({ reset: true });
  assert.equal(await buy([{ id: "13", qty: 1 }]), "/es/tienda/carrito?e=out_of_stock&line=13");
  assert.equal(await buy([{ id: "17", qty: 1 }]), "/es/tienda/carrito?e=unavailable&line=17");
  assert.equal(await buy([{ id: "11", qty: 6 }]), "/es/tienda/carrito?e=out_of_stock&line=11");
  assert.equal(await buy([{ id: "12", qty: 0 }]), "/es/tienda/carrito?e=bad_qty&line=12");
  assert.equal(await buy([]), "/es/tienda/carrito?e=empty");
});

await t("server action: gateway turned off now closes checkout at once, even with the pages' cache", async () => {
  await control({ reset: true, set: { gateways: [{ id: "bacs", enabled: false }] } });
  assert.equal(await buy(), "/es/tienda/carrito?e=disabled");
  await control({ reset: true });
});

await t("server action: production needs no trusted IP source any more: it only reads", () => withEnv({ NODE_ENV: "production" }, async () => {
  await control({ reset: true });
  assert.equal((await shopReadiness()).canCheckout, true);
  assert.ok((await buy()).includes("/checkout-link/"));
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
