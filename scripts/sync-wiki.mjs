// Snapshot of the official SphereWars wiki (Wiki.js) into src/content/wiki.json + public/wiki/images.
// Usage: node scripts/sync-wiki.mjs [--no-images]
// The wiki stays the canonical source: re-run to refresh. HTML is sanitized (allow-list) before it is stored.
import fs from "node:fs/promises";
import path from "node:path";
import sanitizeHtml from "sanitize-html";

const ORIGIN = "https://wiki-spherewars.klerix.com";
const ROOT = path.resolve(import.meta.dirname, "..");
const IMG_DIR = path.join(ROOT, "public", "wiki", "images");
const skipImages = process.argv.includes("--no-images");
const MAX_IMG = 15 * 1024 * 1024;

const slugSeg = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const slugPath = (p) => p.split("/").map(slugSeg).filter(Boolean).join("/");
const gql = async (query) => (await (await fetch(`${ORIGIN}/graphql`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) })).json()).data;

const categories = {
  dioses: "Divinidades", lugares: "Geografía", "quinta-esencia": "Hebrado y Quinta Esencia", personajes: "Personajes y combatientes",
  cronologia: "Cronologías", historia: "Historia de Saphir", facciones: "Facciones", home: "Introducción",
};

const list = (await gql("{pages{list{id path locale title description updatedAt}}}")).pages.list.filter((p) => !p.path.startsWith("plantillas"));
const slugByPath = new Map(list.map((p) => [p.path.toLowerCase(), slugPath(p.path)]));
console.log(`${list.length} pages`);

const images = new Map(); // wiki src -> local url
async function fetchImage(src) {
  if (images.has(src)) return images.get(src);
  let url;
  try { url = new URL(src, ORIGIN); } catch { return null; }
  if (url.origin !== ORIGIN) return null; // never hotlink or fetch third-party hosts
  const rel = decodeURIComponent(url.pathname).replace(/^\/+/, "").split("/").map((s, i, a) => (i === a.length - 1 ? s.replace(/[^\w.\-]+/g, "_") : slugSeg(s))).join("/");
  const local = `/wiki/images/${rel}`;
  if (skipImages) { images.set(src, local); return local; }
  const dest = path.join(IMG_DIR, rel);
  try {
    await fs.access(dest);
  } catch {
    const r = await fetch(url);
    if (!r.ok || !(r.headers.get("content-type") ?? "").startsWith("image/")) { console.warn("skip", url.pathname, r.status); return null; }
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > MAX_IMG) { console.warn("too big", url.pathname); return null; }
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, buf);
  }
  images.set(src, local);
  return local;
}

const pages = [];
for (const p of list) {
  const html = await (await fetch(`${ORIGIN}/${p.locale}/${p.path}`)).text();
  const m = html.match(/<template slot="contents">([\s\S]*?)<\/template>/);
  if (!m) { console.warn("no content", p.path); continue; }

  // collect and localise images first
  const srcs = [...m[1].matchAll(/<img[^>]+src="([^"]+)"/g)].map((x) => x[1]);
  const map = new Map();
  for (const s of srcs) { const l = await fetchImage(s.replace(/&amp;/g, "&")); if (l) map.set(s, l); }

  const clean = sanitizeHtml(m[1], {
    allowedTags: ["p", "h1", "h2", "h3", "h4", "ul", "ol", "li", "blockquote", "table", "thead", "tbody", "tr", "th", "td", "strong", "em", "a", "img", "figure", "figcaption", "br", "hr", "div", "span"],
    allowedAttributes: { a: ["href"], img: ["src", "alt", "width", "height"], div: ["class"], th: ["colspan"], td: ["colspan"] },
    allowedClasses: { div: ["table-container"] },
    transformTags: {
      img: (tag, a) => ({ tagName: "img", attribs: { src: map.get(a.src) ?? "", alt: a.alt ?? "", loading: "lazy" } }),
      a: (tag, a) => {
        const href = a.href ?? "";
        let u; try { u = new URL(href, ORIGIN); } catch { return { tagName: "span", attribs: {} }; }
        if (u.origin === ORIGIN) {
          const key = decodeURIComponent(u.pathname).replace(/^\/(es\/)?/, "").toLowerCase();
          const slug = slugByPath.get(key);
          return slug ? { tagName: "a", attribs: { href: `/__LOCALE__/wikisphere/${slug}${u.hash}` } } : { tagName: "span", attribs: {} };
        }
        return /^https?:$/.test(u.protocol) ? { tagName: "a", attribs: { href: u.href, rel: "noopener nofollow", target: "_blank" } } : { tagName: "span", attribs: {} };
      },
    },
    allowedSchemes: ["http", "https"],
  }).replace(/<img[^>]*src=""[^>]*>/g, "");

  const first = p.path.split("/")[0];
  const cat = slugSeg(first);
  const title = (html.match(/<title>([^<]*?)(?: \| Wiki Spherewars)?<\/title>/)?.[1] ?? p.title).replace(/&#39;/g, "'").replace(/&amp;/g, "&").trim();
  pages.push({
    path: p.path, slug: slugPath(p.path), category: cat, categoryName: categories[cat] ?? first,
    title, description: p.description || "", updatedAt: p.updatedAt, html: clean,
    image: map.size ? [...map.values()][0] : null,
  });
  process.stdout.write(".");
}
console.log(`\n${pages.length} pages, ${images.size} images`);
await fs.mkdir(path.join(ROOT, "src", "content"), { recursive: true });
await fs.writeFile(path.join(ROOT, "src", "content", "wiki.json"), JSON.stringify({ source: ORIGIN, syncedAt: new Date().toISOString(), pages }, null, 1));
