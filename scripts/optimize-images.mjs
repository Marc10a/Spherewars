// Converts synced wiki images to WebP (max 1600px wide) and rewrites references in src/content/wiki.json.
// Usage: node scripts/optimize-images.mjs   (run after sync-wiki.mjs)
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIR = path.join(ROOT, "public", "wiki", "images");
const JSON_PATH = path.join(ROOT, "src", "content", "wiki.json");

async function* walk(d) {
  for (const e of await fs.readdir(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) yield* walk(p); else yield p;
  }
}

const renamed = new Map(); // old public URL -> new public URL
let before = 0, after = 0;
for await (const file of walk(DIR)) {
  if (!/\.(png|jpe?g)$/i.test(file)) continue;
  const out = file.replace(/\.(png|jpe?g)$/i, ".webp");
  const buf = await fs.readFile(file);
  before += buf.length;
  const webp = await sharp(buf).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
  after += webp.length;
  await fs.writeFile(out, webp);
  await fs.rm(file);
  const rel = (f) => "/wiki/images/" + path.relative(DIR, f).split(path.sep).join("/");
  renamed.set(rel(file), rel(out));
}

let json = await fs.readFile(JSON_PATH, "utf8");
for (const [from, to] of renamed) json = json.split(from).join(to);
await fs.writeFile(JSON_PATH, json);
console.log(`${renamed.size} images: ${(before / 1048576).toFixed(1)} MB -> ${(after / 1048576).toFixed(1)} MB`);
