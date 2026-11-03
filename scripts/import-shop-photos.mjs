// Converts the owner's miniature photos (E:\SphereUSB\Fotos mini...) into web images and writes src/content/shop-photos.json.
// Per miniature the owner provides 4 shots: 1 = branded card, 2 = clean photo, 3 = photo on the faction's background (2:3),
// 4 = photo on white with its size. The shop uses 3 as the catalogue picture and shows them in the order 3, 2, 4, 1.
// Usage: node scripts/import-shop-photos.mjs "E:/SphereUSB/Fotos mini, con fondo, con tamaño y branding"
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

sharp.cache(false);
const SRC = process.argv[2];
const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "public", "tienda");
const FACTION_DIR = { Alianza: "alianza", Adeptos: "adeptos-de-malesur", Manadas: "mandas-de-urueh", "Vástagos": "vastagos-de-kurgan" };
// file prefix -> wiki page (last segment). Leva has three minis (A, B, C) in one product.
const NAMES = {
  Alianza: { Explorador: "explorador", Laroc: "laroc", Nirlem: "nirlem", Oteadora: "oteadora", Recaudadora: "recaudadora", "Ródanes": "rodanes", "Róxter": "roxter", "Équite": "corazon-equite", "Cohorte Postulante": "corazon-postulante" },
  Adeptos: { Cangrejo: "cangrejo", Liehhan: "liehhan", Mangostas: "mangostas", Morena: "morena", Serpiente: "serpiente", Toro: "toro", Yenay: "yenay", "Águila": "aguila" },
  Manadas: { Abrasador: "abrasador", Calcinador: "calcinador", Fundidor: "fundidor", Leva: "leva-demontre", Lucio: "lucio", Pyronus: "pyronus", Sorkep: "sorkep", "Sátanor": "satanor" },
  "Vástagos": { Acechador: "acechador", "Chamán": "chaman", Desacrador: "desacrador", Destripador: "destripador", "Jorguín": "jorguin", "Leviatán": "leviatan", "Nek'Org": "nek-org", Raggarth: "raggarth", Regoretes: "regoretes" },
};
const PACKS = { Alianza: "0 SP Alianza", Adeptos: "0 SP Adeptos", Manadas: "0 SP Manadas", "Vástagos": "0 SP Vástagos" };

const find = (dir, base) => fs.readdirSync(dir).find((f) => f.toLowerCase().replace(/\.(jpe?g|png)$/, "") === base.toLowerCase());
const result = {};
let count = 0;

async function save(dir, file, outName, maxSide, quality) {
  const outFile = path.join(OUT, FACTION, outName);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const buf = await sharp(path.join(dir, file)).rotate().resize({ width: maxSide, height: maxSide, fit: "inside", withoutEnlargement: true }).webp({ quality }).toBuffer();
  fs.writeFileSync(outFile, buf);
  count++;
  return `/tienda/${FACTION}/${outName}`;
}
let FACTION = "";

for (const [folder, prefixes] of Object.entries(NAMES)) {
  const dir = path.join(SRC, folder);
  FACTION = FACTION_DIR[folder];
  for (const [prefix, last] of Object.entries(prefixes)) {
    const shots = {};
    if (prefix === "Leva") {
      // three miniatures: take the 3-shot of each, the size shot of B and the card
      const pick = async (base, role, max, q) => { const f = find(dir, base); if (f) shots[role] = await save(dir, f, `${last}-${role}.webp`, max, q); };
      const g = [];
      for (const [base, role] of [["Leva A 3", "bg-a"], ["Leva B 3", "bg-b"], ["Leva C 3", "bg-c"], ["Leva B 4", "size"], ["Leva 1", "card"]]) await pick(base, role, base.endsWith("3") ? 1536 : 1500, 82);
      for (const r of ["bg-a", "bg-b", "bg-c", "size", "card"]) if (shots[r]) g.push({ src: shots[r], kind: r });
      result[`personajes/${FACTION_DIR[folder]}/${last}`] = { tile: shots["bg-a"], gallery: g };
      continue;
    }
    const cohort = prefix === "Cohorte Postulante";
    const names = cohort ? { bg: "Cohorte Postulante A 3", bg2: "Cohorte Postulante B 3", clean: "Cohorte Postulante A 2", size: "Cohorte Postulante A 4", card: "Cohorte Postulante 1" }
      : { bg: `${prefix} 3`, clean: `${prefix} 2`, size: `${prefix} 4`, card: `${prefix} 1` };
    for (const [role, base] of Object.entries(names)) {
      const f = find(dir, base);
      if (!f) continue;
      shots[role] = await save(dir, f, `${last}-${role}.webp`, role === "card" ? 1500 : 1536, role === "bg" || role === "bg2" ? 80 : 82);
    }
    const order = cohort ? ["bg", "bg2", "size", "card"] : ["bg", "clean", "size", "card"];
    const gallery = order.filter((r) => shots[r]).map((r) => ({ src: shots[r], kind: r }));
    if (!gallery.length) { console.log("no photos for", prefix); continue; }
    result[`personajes/${FACTION}/${last}`] = { tile: shots.bg ?? shots.clean ?? gallery[0].src, gallery };
  }
  // starter pack card
  const pf = find(dir, PACKS[folder]);
  if (pf) {
    const src = await save(dir, pf, "starter-pack.webp", 1500, 82);
    const key = `packs/${folder === "Manadas" ? "manadas-de-urueh" : FACTION}`;
    result[key] = { tile: src, gallery: [{ src, kind: "card" }] };
  }
}
fs.writeFileSync(path.join(ROOT, "src/content/shop-photos.json"), JSON.stringify({ _note: "Fotos oficiales de miniaturas y Starter Packs (carpeta del propietario). Orden de la galería: fondo, limpia, con tamaño, tarjeta.", photos: result }, null, 1));
console.log(count, "images,", Object.keys(result).length, "products with photos");
