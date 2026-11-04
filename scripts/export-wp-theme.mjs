// Exports the public website as a WordPress theme with EXACTLY the same pages: every URL of the running Next.js site is fetched,
// its HTML (header, content and footer) is stored as a template, the compiled CSS/fonts/images are copied, and the theme's PHP
// serves each URL from those templates. Nothing is redesigned: the markup, classes and text are the site's own.
//
// Usage:  1) npm run build && npx next start -p 3200      (any build of the site; set NEXT_PUBLIC_SITE_URL unset: it is replaced at runtime)
//         2) node scripts/export-wp-theme.mjs http://localhost:3200
import fs from "node:fs";
import path from "node:path";

const BASE = (process.argv[2] ?? "http://localhost:3200").replace(/\/$/, "");
const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "wordpress", "theme", "spherewars");
const LOCALES = ["es", "en", "ca"];
const SITE_TOKEN = "http://localhost:3000"; // siteUrl baked into the build (default when NEXT_PUBLIC_SITE_URL is unset)

const get = async (p, init) => fetch(BASE + p, { redirect: "manual", ...init });
const text = async (p) => { const r = await get(p); return { status: r.status, body: await r.text() }; };
const ensure = (d) => fs.mkdirSync(d, { recursive: true });
const write = (f, s) => { ensure(path.dirname(f)); fs.writeFileSync(f, s); };

// ---- URL list --------------------------------------------------------------------------------------------------------
const sitemap = (await text("/sitemap.xml")).body;
const urls = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1].replace(SITE_TOKEN, BASE)).pathname));
const i18nSrc = fs.readFileSync(path.join(ROOT, "src/lib/i18n.ts"), "utf8");
const cats = [...(i18nSrc.match(/minis: \{[\s\S]*?cats: \{([^}]*)\}/)?.[1] ?? "").matchAll(/(\w+):/g)].map((m) => m[1]);
const factions = [...fs.readFileSync(path.join(ROOT, "src/content/factions.ts"), "utf8").matchAll(/slug: "([a-z-]+)", name/g)].map((m) => m[1]);
const wiki = JSON.parse(fs.readFileSync(path.join(ROOT, "src/content/wiki.json"), "utf8"));
const wikiCats = [...new Set(wiki.pages.map((p) => p.category))];
for (const l of LOCALES) {
  for (const p of ["", "/buscar", "/tienda/carrito", "/tienda/gracias", "/miniaturas", "/eventos", "/wikisphere"]) urls.add(`/${l}${p}`);
  for (const f of factions) urls.add(`/${l}/miniaturas?faccion=${f}`);
  for (const c of cats) urls.add(`/${l}/miniaturas?categoria=${c}`);
  for (const c of wikiCats) urls.add(`/${l}/wikisphere?categoria=${c}`);
  // shop filters: parameters in the order of shopHref (src/lib/shop/catalogue.ts) and of ksort in the theme's router
  for (const base of [`/${l}/tienda`, ...factions.map((f) => `/${l}/tienda/${f}`)]) {
    for (const orden of ["", "precio", "puntos"]) for (const tipo of ["", "starter", "sueltas"]) {
      const qs = [orden && `orden=${orden}`, tipo && `tipo=${tipo}`].filter(Boolean).join("&");
      if (qs) urls.add(`${base}?${qs}`);
    }
  }
}
const list = [...urls].filter((u) => !/^\/(api|admin|_next)/.test(u)).sort();

// ---- HTML processing -------------------------------------------------------------------------------------------------
const asset = (p) => `{{A}}${p}`;
function resolveSuspense(h) {
  // React streams Suspense content in a hidden <div id="S:n"> plus a script that moves it; do that move here.
  for (let i = 0; i < 20; i++) {
    const open = h.match(/<div hidden id="S:(\d+)">/);
    if (!open) break;
    const n = open[1], from = open.index + open[0].length;
    const end = new RegExp(String.raw`</div><script>[\s\S]*?\$RC\("B:` + n + String.raw`","S:` + n + String.raw`"\)[^<]*</script>`).exec(h.slice(from));
    if (!end) break;
    const content = h.slice(from, from + end.index);
    h = h.slice(0, open.index) + h.slice(from + end.index + end[0].length);
    h = h.replace(new RegExp(`<template id="B:${n}"></template>`), () => content);
  }
  return h;
}
function cleanBody(h) {
  h = resolveSuspense(h);
  h = h.replace(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g, (m) => m.replace(/<script/, "<SCRIPTLD").replace(/<\/script>/, "</SCRIPTLD>"));
  h = h.replace(/<script\b[\s\S]*?<\/script>/g, "");
  h = h.replace(/<SCRIPTLD/g, "<script").replace(/<\/SCRIPTLD>/g, "</script>");
  h = h.replace(/<!--[\s\S]*?-->/g, "").replace(/<template[^>]*><\/template>/g, "").replace(/<div hidden="">\s*<\/div>/g, "");
  // next/image -> the original file
  const orig = (u) => asset(decodeURIComponent(u.replace(/&amp;/g, "&")));
  h = h.replace(/\s(?:srcSet|srcset)="[^"]*"/g, "");
  h = h.replace(/\/_next\/image\?url=([^&"]+)(?:&amp;|&)[^"]*/g, (_, u) => orig(u));
  h = h.replace(/(["'(])(\/(?:wiki|miniaturas|brand|fotos-miniaturas|tienda|material)\/[^"')\s]*|\/og\.jpg)/g, (_, q, p) => q + asset(p));
  h = h.split(SITE_TOKEN).join("{{S}}");
  return h.trim();
}
const attr = (s, re) => s.match(re)?.[0] ?? "";
function headOf(h) {
  const head = h.slice(0, h.indexOf("</head>"));
  const keep = [
    attr(head, /<title>[\s\S]*?<\/title>/),
    attr(head, /<meta name="description"[^>]*>/),
    attr(head, /<meta name="robots"[^>]*>/),
    attr(head, /<link rel="canonical"[^>]*>/),
    ...(head.match(/<link rel="alternate"[^>]*>/g) ?? []),
    ...(head.match(/<meta property="og:[^>]*>/g) ?? []),
    ...(head.match(/<meta name="twitter:[^>]*>/g) ?? []),
  ].filter(Boolean).join("\n");
  return keep.split(SITE_TOKEN).join("{{S}}").replace(/hrefLang=/g, "hreflang=").replace(/\/\>/g, "/>");
}
const slugOf = (u) => (u === "/" ? "index" : u.replace(/^\//, "").replace(/\?/g, "@").replace(/[/&=]/g, (c) => ({ "/": "__", "&": "+", "=": "-" }[c])));

fs.rmSync(OUT, { recursive: true, force: true });
ensure(path.join(OUT, "pages"));
const routes = {};
let htmlClass = "", bodyClass = "";
// crawl: start from the known URLs and follow every internal link, so no page of the site is left out
const queue = [...list], queued = new Set(queue);
for (let qi = 0; qi < queue.length; qi++) {
  const u = queue[qi];
  const { status, body } = await text(u);
  if (status !== 200) { console.log("skip", status, u); continue; }
  for (const m of body.matchAll(/href="(\/(?:es|en|ca)(?:\/[^"?#]*)?)"/g)) if (!queued.has(m[1])) { queued.add(m[1]); queue.push(m[1]); }
  htmlClass ||= attr(body, /<html[^>]*class="([^"]*)"/).replace(/.*class="|"$/g, "");
  bodyClass ||= attr(body, /<body[^>]*class="([^"]*)"/).replace(/.*class="|"$/g, "");
  const inner = body.slice(body.indexOf(">", body.indexOf("<body")) + 1, body.lastIndexOf("</body>"));
  const file = slugOf(u) + ".html";
  write(path.join(OUT, "pages", file), cleanBody(inner));
  routes[u] = { f: file, h: headOf(body), lang: u.split("/")[1] };
}
// the not-found page (served with status 404)
for (const l of LOCALES) {
  const r = await text(`/${l}/__no-existe`);
  const inner = r.body.slice(r.body.indexOf(">", r.body.indexOf("<body")) + 1, r.body.lastIndexOf("</body>"));
  write(path.join(OUT, "pages", `404-${l}.html`), cleanBody(inner));
  routes[`404:${l}`] = { f: `404-${l}.html`, h: headOf(r.body), lang: l };
}
write(path.join(OUT, "routes.json"), JSON.stringify({ htmlClass, bodyClass, routes }));

// ---- CSS + fonts -----------------------------------------------------------------------------------------------------
const home = (await text("/es")).body;
const sheets = [...home.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);
let css = "";
for (const s of sheets) css += (await text(s)).body + "\n";
css = css.replace(/url\(\/_next\/static\/media\/([^)]+)\)/g, "url(fonts/$1)");
write(path.join(OUT, "assets", "app.css"), css);
const media = path.join(ROOT, ".next", "static", "media");
if (fs.existsSync(media)) for (const f of fs.readdirSync(media)) { ensure(path.join(OUT, "assets", "fonts")); fs.copyFileSync(path.join(media, f), path.join(OUT, "assets", "fonts", f)); }

// ---- public files, SEO files -----------------------------------------------------------------------------------------
// public/descargas (print-quality posters, maps, PDFs) is NOT part of the theme: it is uploaded to the site root (see the guide)
fs.cpSync(path.join(ROOT, "public"), path.join(OUT, "assets", "public"), { recursive: true, filter: (src) => !/[\\/]public[\\/]descargas(?:[\\/]|$)/.test(src) });
for (const f of ["sitemap.xml", "robots.txt", "manifest.webmanifest"]) {
  write(path.join(OUT, "assets", "seo", f), (await text("/" + f)).body.split(SITE_TOKEN).join("{{S}}"));
}
const ico = await get("/favicon.ico");
write(path.join(OUT, "assets", "seo", "favicon.ico"), Buffer.from(await ico.arrayBuffer()));

// ---- data used by the theme's PHP/JS (search, cart, menus, contact messages) --------------------------------------------------
const { pathToFileURL } = await import("node:url");
const { dict } = await import(pathToFileURL(path.join(ROOT, "src/lib/i18n.ts")).href);
const pick = (d) => ({ nav: d.nav, a11y: d.a11y, shop: d.shop, contact: d.contact, common: d.common, search: d.search, news: d.news, events: d.events, home: { newsTitle: d.home.newsTitle, newsEmpty: d.home.newsEmpty, allNews: d.home.allNews, eventsTitle: d.home.eventsTitle, eventsEmpty: d.home.eventsEmpty, allEvents: d.home.allEvents }, wiki: { cat: d.wiki.cat, all: d.wiki.all, articles: d.wiki.articles } });
write(path.join(OUT, "data", "i18n.json"), JSON.stringify(Object.fromEntries(LOCALES.map((l) => [l, pick(dict[l])]))));
const strip = (html) => html.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").toLowerCase();
const norm = (x) => x.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
write(path.join(OUT, "data", "wiki-index.json"), JSON.stringify(wiki.pages.map((p) => ({ slug: p.slug, title: p.title, description: p.description, category: p.category, categoryName: p.categoryName, image: p.image }))));
write(path.join(OUT, "data", "wiki-search.json"), JSON.stringify(Object.fromEntries(wiki.pages.map((p) => [p.slug, norm(`${p.title} ${p.description} ${strip(p.html)}`)]))));

// ---- shop index: products (for the admin dropdown) and aliases
const docsJson = JSON.parse(fs.readFileSync(path.join(ROOT, "src/content/shop-products.json"), "utf8"));
write(path.join(OUT, "data", "shop-index.json"), JSON.stringify({ aliases: docsJson.aliases, products: Object.entries(docsJson.products).map(([slug, d]) => ({ slug, title: d.title, faction: d.faction })) }));

// ---- buy box template per language (taken from a real product page; the item data becomes a placeholder) ----------------------
for (const l of LOCALES) {
  const html = fs.readFileSync(path.join(OUT, "pages", `${l}__tienda__manadas-de-urueh__satanor.html`), "utf8");
  const start = html.indexOf('<div class="space-y-4" data-sw-item="');
  if (start < 0) throw new Error("buy box not found in the stored product page");
  let depth = 0, end = -1;
  for (const m of html.slice(start).matchAll(/<(\/?)div\b/g)) { depth += m[1] ? -1 : 1; if (depth === 0) { end = start + m.index + 6; break; } }
  const box = html.slice(start, end).replace(/data-sw-item="[^"]*"/, 'data-sw-item="{{ITEM}}"');
  write(path.join(OUT, "data", `buybox-${l}.html`), box);
}

// ---- theme source (PHP + JS) -------------------------------------------------------------------------------------------------
fs.cpSync(path.join(ROOT, "wordpress", "theme-src"), OUT, { recursive: true });

console.log(`pages: ${Object.keys(routes).length}, css: ${(css.length / 1024).toFixed(0)} KB, fonts: ${fs.existsSync(path.join(OUT, "assets", "fonts")) ? fs.readdirSync(path.join(OUT, "assets", "fonts")).length : 0}`);
