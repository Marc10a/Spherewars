// Crops the empty margins of the library illustrations in public/miniaturas (e.g. a tiny figure on a big transparent/white canvas)
// so they fill the product card. Only touches a file when at least 25% of its area is empty. Safe to re-run.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

sharp.cache(false); // do not keep files open (Windows would refuse to overwrite them)

const dir = path.resolve(import.meta.dirname, "..", "public", "miniaturas");
for (const f of fs.readdirSync(dir).filter((n) => n.endsWith(".webp"))) {
  const file = path.join(dir, f);
  const before = await sharp(file).metadata();
  const { data, info } = await sharp(file).trim({ threshold: 18 }).toBuffer({ resolveWithObject: true });
  const kept = (info.width * info.height) / (before.width * before.height);
  if (kept > 0.75) { console.log("ok   ", f, `${before.width}x${before.height}`); continue; }
  const pad = Math.round(Math.max(info.width, info.height) * 0.04);
  await sharp(data).extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 88 }).toBuffer().then((b) => fs.writeFileSync(file, b));
  console.log("trim ", f, `${before.width}x${before.height} -> ${info.width + 2 * pad}x${info.height + 2 * pad}`);
}
