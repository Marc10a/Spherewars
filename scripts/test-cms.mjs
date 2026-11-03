// Tests for the WordPress (headless) layer: contract, client, mapping, secrets and HTML sanitising.
// Run: npm run test:cms   (Node 22.6+ for .ts imports; no network and no WordPress needed)
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { newsList, eventList, featuredMinis } from "../src/lib/cms/contract.ts";
import { wpGet, wpUrl } from "../src/lib/cms/client.ts";
import { toEventRow, toNewsRow } from "../src/lib/cms/map.ts";
import { safeEqual, revalidatablePath } from "../src/lib/cms/secret.ts";
import { cleanCmsHtml } from "../src/lib/cms/sanitize.ts";

let pass = 0;
const t = async (name, fn) => { await fn(); pass++; console.log("ok  ", name); };
const fx = (n) => JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, "..", "wordpress", "fixtures", `${n}.json`), "utf8"));
const jsonRes = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

// ---- contract -------------------------------------------------------------
await t("contract: the fixtures are valid", () => {
  assert.equal(newsList.parse(fx("news")).items.length, 2);
  assert.equal(eventList.parse(fx("events")).items.length, 2);
  assert.equal(featuredMinis.parse(fx("featured-minis")).slugs.length, 3);
});
await t("contract: numeric ids become strings; optional fields get defaults", () => {
  const n = newsList.parse(fx("news")).items[1];
  assert.equal(n.id, "102"); assert.equal(n.image, null); assert.equal(n.seo.title, null);
});
await t("contract: invalid payloads are rejected", () => {
  const bad = (schema, v) => assert.equal(schema.safeParse(v).success, false);
  bad(newsList, { items: [{ id: 1, slug: "Mal Slug!", title: "x", published_at: null }] });
  bad(newsList, { items: [{ id: 1, slug: "ok", title: "", published_at: null }] });
  bad(newsList, { items: [{ id: 1, slug: "ok", title: "x", published_at: "not a date" }] });
  bad(newsList, { items: [{ id: 1, slug: "ok", title: "x", published_at: null, image: { url: "javascript:alert(1)" } }] });
  bad(eventList, { items: [{ id: 1, slug: "e", kind: "party", title: "x", starts_at: "2030-01-01" }] });
  bad(eventList, { items: [{ id: 1, slug: "e", kind: "demo", title: "x", starts_at: "2030-01-01", registration_url: "ftp://x" }] });
  bad(featuredMinis, { slugs: ["../../etc/passwd"] });
  bad(featuredMinis, { slugs: ["http://evil"] });
});

// ---- client ---------------------------------------------------------------
await t("client: builds the namespaced URL and ignores empty params", () => {
  assert.equal(wpUrl("https://cms.x.es/", "news", { lang: "es", limit: 3, slug: undefined }), "https://cms.x.es/wp-json/sphere/v1/news?lang=es&limit=3");
});
await t("client: returns validated data on success", async () => {
  const r = await wpGet("news", newsList, { baseUrl: "https://cms.x.es", fetchImpl: async () => jsonRes(fx("news")) });
  assert.equal(r.items[0].title, "Noticia de prueba desde WordPress");
});
await t("client: null on HTTP error, invalid JSON, schema mismatch and network error", async () => {
  const run = (fetchImpl) => wpGet("news", newsList, { baseUrl: "https://cms.x.es", fetchImpl });
  assert.equal(await run(async () => jsonRes({ error: "x" }, 500)), null);
  assert.equal(await run(async () => new Response("<html>", { status: 200 })), null);
  assert.equal(await run(async () => jsonRes({ items: [{ nope: true }] })), null);
  assert.equal(await run(async () => { throw new Error("ECONNREFUSED"); }), null);
});
await t("client: a slow WordPress is cut off by the timeout (site must not hang)", async () => {
  const slow = (_url, init) => new Promise((_res, rej) => init.signal.addEventListener("abort", () => rej(new Error("aborted"))));
  const t0 = Date.now();
  assert.equal(await wpGet("news", newsList, { baseUrl: "https://cms.x.es", fetchImpl: slow, timeoutMs: 150 }), null);
  assert.ok(Date.now() - t0 < 1500);
});
await t("client: the preview token is sent only when given, and disables caching", async () => {
  let seen;
  const spy = async (url, init) => { seen = init; return jsonRes(fx("news")); };
  await wpGet("news", newsList, { baseUrl: "https://cms.x.es", fetchImpl: spy });
  assert.equal(seen.headers.Authorization, undefined);
  await wpGet("news", newsList, { baseUrl: "https://cms.x.es", fetchImpl: spy, previewToken: "tok" });
  assert.equal(seen.headers.Authorization, "Bearer tok"); assert.equal(seen.cache, "no-store");
});

// ---- mapping --------------------------------------------------------------
await t("map: WordPress items become the shapes the pages use", () => {
  const n = toNewsRow(newsList.parse(fx("news")).items[0]);
  assert.equal(n.publish_at, "2026-10-20T10:00:00Z"); assert.ok(n.body.html.includes("<strong>"));
  const e = toEventRow(eventList.parse(fx("events")).items[0]);
  assert.equal(e.registration_open, false); assert.equal(e.registration_url, "https://example.com/inscripcion"); assert.equal(e.fee_cents, 1000);
});

// ---- secrets & paths ------------------------------------------------------
await t("safeEqual: equal secrets match; wrong, empty or missing never do", () => {
  assert.equal(safeEqual("abc123", "abc123"), true);
  assert.equal(safeEqual("abc123", "abc124"), false);
  assert.equal(safeEqual("abc", "abcd"), false);
  assert.equal(safeEqual("", ""), false);
  assert.equal(safeEqual(null, "x"), false);
  assert.equal(safeEqual("x", undefined), false);
});
await t("revalidation only accepts known site paths", () => {
  for (const p of ["/", "/es", "/en/novedades", "/ca/eventos/torneo-de-prueba", "/es/miniaturas"]) assert.equal(revalidatablePath(p), true, p);
  for (const p of ["/admin", "/api/revalidate", "//evil.com", "/es/../admin", "https://x.com", "/xx/novedades", "/es/novedades?x=1", 5, null, "/" + "a".repeat(300)]) assert.equal(revalidatablePath(p), false, String(p));
});

// ---- HTML sanitising ------------------------------------------------------
await t("sanitiser: removes scripts, event handlers, styles and unsafe URLs; keeps allowed markup", () => {
  const dirty = fx("news").items[0].content_html
    + '<p style="color:red" onclick="x()">t</p><a href="javascript:alert(1)">bad</a><img src="http://insecure/x.jpg"><iframe src="https://evil"></iframe><a href="https://ok.com">ok</a><img src="data:image/png;base64,AAAA">';
  const out = cleanCmsHtml(dirty);
  assert.ok(!/<script|onerror|onclick|javascript:|style=|<iframe|http:\/\/insecure|data:image/i.test(out), out);
  assert.ok(out.includes("<strong>de prueba</strong>"));
  assert.ok(/<a href="https:\/\/example\.com"[^>]*rel="noopener nofollow"[^>]*target="_blank"/.test(out), out);
  assert.ok(/<img src="https:\/\/cms\.example\.com\/wp-content\/uploads\/a\.jpg"[^>]*alt="Foto"/.test(out), out);
});

console.log(`\n${pass} tests passed`);
