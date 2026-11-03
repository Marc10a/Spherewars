// Builds src/content/mini-photos.json + public/miniaturas/*.webp: the images used for miniatures whose wiki page has none.
//
//   1) Official illustrations listed in scripts/mini-photo-sources.json are downloaded from the wiki asset library.
//   2) YOUR OWN PHOTOS: drop files into  fotos-miniaturas/  named after the end of the wiki slug, e.g.
//        fotos-miniaturas/nirlem.jpg     -> personajes/alianza/nirlem
//        fotos-miniaturas/lince.png      -> personajes/adeptos-de-malesur/lince
//      They are resized, converted to WebP and always win over illustrations (kind "photo").
//
// Usage: npm run photos
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "miniaturas");
const DROP_DIR = path.join(ROOT, "fotos-miniaturas");
const MAP_PATH = path.join(ROOT, "src", "content", "mini-photos.json");
const wiki = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "content", "wiki.json"), "utf8"));
const slugs = wiki.pages.filter((p) => p.slug.startsWith("personajes/")).map((p) => p.slug);
const byLast = new Map();
for (const s of slugs) { const k = s.split("/").pop(); byLast.set(k, [...(byLast.get(k) ?? []), s]); }

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(DROP_DIR, { recursive: true });
const result = {};

const toWebp = (input, dest) => sharp(input).rotate().resize({ width: 1100, height: 1400, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toFile(dest);

// 1) official illustrations
const sources = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts", "mini-photo-sources.json"), "utf8"));
for (const [slug, s] of Object.entries(sources)) {
  if (slug.startsWith("_")) continue;
  if (!slugs.includes(slug)) { console.warn("unknown wiki slug in sources:", slug); continue; }
  const name = slug.split("/").pop();
  const dest = path.join(OUT_DIR, `${name}.webp`);
  if (!fs.existsSync(dest)) {
    const r = await fetch(`https://wiki-spherewars.klerix.com/${encodeURIComponent(s.file)}`);
    if (!r.ok || !(r.headers.get("content-type") ?? "").startsWith("image/")) { console.warn("download failed:", s.file, r.status); continue; }
    await toWebp(Buffer.from(await r.arrayBuffer()), dest);
  }
  result[slug] = { src: `/miniaturas/${name}.webp`, kind: s.kind };
}

// 2) your own photos (override)
for (const file of fs.readdirSync(DROP_DIR)) {
  if (!/\.(jpe?g|png|webp)$/i.test(file)) continue;
  const name = path.basename(file, path.extname(file)).toLowerCase();
  const targets = byLast.get(name);
  if (!targets) { console.warn(`fotos-miniaturas/${file}: no wiki miniature is called "${name}" (use the end of the slug, e.g. nirlem)`); continue; }
  if (targets.length > 1) { console.warn(`fotos-miniaturas/${file}: "${name}" is ambiguous: ${targets.join(", ")}`); continue; }
  const dest = path.join(OUT_DIR, `${name}.webp`);
  await toWebp(path.join(DROP_DIR, file), dest);
  result[targets[0]] = { src: `/miniaturas/${name}.webp`, kind: "photo" };
}

fs.writeFileSync(MAP_PATH, JSON.stringify(result, null, 1) + "\n");
const photos = Object.values(result).filter((r) => r.kind === "photo").length;
console.log(`${Object.keys(result).length} images (${photos} photos, ${Object.keys(result).length - photos} illustrations)`);
