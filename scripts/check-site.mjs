// Integrity check of the imported content. Usage: node scripts/check-site.mjs  (exit 1 on problems)
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const pub = (u) => path.join(ROOT, "public", u.replace(/^\//, ""));
const wiki = JSON.parse(fs.readFileSync(path.join(ROOT, "src/content/wiki.json"), "utf8"));
const slugs = new Set(wiki.pages.map((p) => p.slug));
const problems = [];

const dupes = wiki.pages.map((p) => p.slug).filter((s, i, a) => a.indexOf(s) !== i);
if (dupes.length) problems.push(`duplicate slugs: ${dupes.join(", ")}`);

let links = 0, images = 0;
for (const p of wiki.pages) {
  for (const [, href] of p.html.matchAll(/href="\/__LOCALE__\/wikisphere\/([^"#]+)/g)) {
    links++;
    if (!slugs.has(href)) problems.push(`${p.slug}: broken internal link -> ${href}`);
  }
  for (const [, src] of p.html.matchAll(/<img[^>]+src="([^"]+)"/g)) {
    images++;
    if (!fs.existsSync(pub(src))) problems.push(`${p.slug}: missing image ${src}`);
  }
  if (/<script|on\w+=|javascript:/i.test(p.html)) problems.push(`${p.slug}: unsafe markup`);
}

const photoMap = JSON.parse(fs.readFileSync(path.join(ROOT, "src/content/mini-photos.json"), "utf8"));
for (const [slug, v] of Object.entries(photoMap)) {
  if (!slugs.has(slug)) problems.push(`mini-photos: unknown wiki slug ${slug}`);
  if (!fs.existsSync(pub(v.src))) problems.push(`mini-photos: missing file ${v.src}`);
}

// shop: owner photos, product documents, prices and official files must all exist and agree with each other
const shopPhotos = JSON.parse(fs.readFileSync(path.join(ROOT, "src/content/shop-photos.json"), "utf8")).photos;
const shopDocs = JSON.parse(fs.readFileSync(path.join(ROOT, "src/content/shop-products.json"), "utf8"));
const prices = JSON.parse(fs.readFileSync(path.join(ROOT, "src/content/prices.json"), "utf8")).prices;
for (const [slug, v] of Object.entries(shopPhotos)) {
  if (!slug.startsWith("packs/") && !slugs.has(slug)) problems.push(`shop-photos: unknown wiki slug ${slug}`);
  for (const g of v.gallery) if (!fs.existsSync(pub(g.src))) problems.push(`shop-photos: missing file ${g.src}`);
}
for (const slug of Object.keys(shopDocs.products)) if (!slug.startsWith("packs/") && !slugs.has(slug)) problems.push(`shop-products: unknown wiki slug ${slug}`);
for (const slug of Object.keys(prices)) if (!shopDocs.products[slug] && !shopDocs.aliases[slug] && !slugs.has(slug)) problems.push(`prices: ${slug} has neither a product document nor a wiki page`);
const official = JSON.parse(fs.readFileSync(path.join(ROOT, "src/content/official-files.json"), "utf8"));
for (const f of [...official.guides, ...official.posters, ...official.maps]) {
  if (!fs.existsSync(pub(f.file))) problems.push(`official file missing ${f.file}`);
  if (f.preview && !fs.existsSync(pub(f.preview))) problems.push(`official preview missing ${f.preview}`);
}

const factions = fs.readFileSync(path.join(ROOT, "src/content/factions.ts"), "utf8");
for (const [, img] of factions.matchAll(/image: "([^"]+)"/g)) if (!fs.existsSync(pub(img))) problems.push(`faction image missing ${img}`);
for (const f of ["public/og.jpg", "public/brand/logo.jpeg"]) if (!fs.existsSync(path.join(ROOT, f))) problems.push(`missing ${f}`);

console.log(`${wiki.pages.length} wiki pages, ${links} internal links, ${images} images`);
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
console.log("OK");
