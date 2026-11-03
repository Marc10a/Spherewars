// Builds the "Material oficial" downloads from the owner's folders: quick guides (PDF), posters/flyer and maps.
// Big files go to public/descargas (print quality), light previews to public/material, and the list to src/content/official-files.json.
// Usage: node scripts/import-usb-files.mjs E:/SphereUSB
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

sharp.cache(false);
const SRC = process.argv[2];
const ROOT = path.resolve(import.meta.dirname, "..");
const DL = path.join(ROOT, "public", "descargas"), PV = path.join(ROOT, "public", "material");
fs.mkdirSync(DL, { recursive: true }); fs.mkdirSync(PV, { recursive: true });

const guides = [
  ["guia-rapida-a4", "Guía rápida 2026 · A4 (imprimible)", "Guía rápida A4 y A5 imprimible/Guía Rápida 2026 A4.pdf"],
  ["guia-rapida-a5", "Guía rápida 2026 · A5 (imprimible)", "Guía rápida A4 y A5 imprimible/Guía Rápida 2026 A5.pdf"],
];
const posters = [
  ["poster-50x70", "Póster 50×70 · SphereWars Otro Mundo", "Posters, flyer, cartel y banner/Poster 50x70 SphereWars Otro Mundo.png"],
  ["poster-a3-facciones", "Póster A3 · Las cuatro facciones", "Posters, flyer, cartel y banner/Poster A3 Facciones.png"],
  ["poster-a3-golothar", "Póster A3 · Mapa de Golothar", "Posters, flyer, cartel y banner/Poster A3 Golothar.png"],
  ["poster-a3-raggarth", "Póster A3 · Raggarth (con QR)", "Posters, flyer, cartel y banner/Poster A3 Raggarth QR.png"],
  ["cartel-a4", "Cartel A4 · SphereWars", "Posters, flyer, cartel y banner/Poster A4 Cartel.png"],
  ["flyer-2026-anverso", "Flyer 2026 · anverso", "Posters, flyer, cartel y banner/Flyer SW2026_Front.png"],
  ["flyer-2026-reverso", "Flyer 2026 · reverso", "Posters, flyer, cartel y banner/Flyer SW2026_back.png"],
];
const maps = [
  ["mapa-golothar", "Mapa de Golothar", "Mapas/Mapa Golothar.jpg"],
  ["mapa-saphir", "Mapa de Saphir 2026", "Mapas/Mapa de Saphir 2026.PNG"],
  ["esfera-saphir", "La esfera de Saphir", "Mapas/Esfera Saphir Completo con nombres.png"],
  ["escalas-distancias", "Escalas y distancias de Saphir", "Mapas/Escalas y distancias.png"],
  ["darlime", "Darlime", "Mapas/Darlime.PNG"],
  ["teokkis", "Mapa de Teokkis 2026", "Mapas/Mapa de Teokkis 2026.PNG"],
  ["bosque-de-lilean", "Bosque de Lilean", "Mapas/Mapa Bosque de Lilean.PNG"],
  ["cienagas-de-bolban", "Ciénagas de Bolban", "Mapas/Ciénagas de Bolban Mapa.PNG"],
  ["azorhan", "Azörhan", "Mapas/Mapa de Azörhan Big.PNG"],
  ["volcanes-de-urueh", "Los volcanes de Urueh", "Mapas/Mapa de los Volcanes de Urueh.jpg"],
  ["picos-de-kurgan", "Picos de Kurgan", "Mapas/Picos de Kurgan Mapa.png"],
  ["caldara", "Caldara, la Flor del Lago", "Mapas/Mapa de Caldara, la Flor del Lago.png"],
  ["ciudadela-del-corazon", "La Ciudadela del Corazón", "Mapas/Mapa Ciudadela del Corazón.png"],
  ["zonas-volcanicas", "Zonas volcánicas", "Mapas/Zonas Volcánicas.PNG"],
  ["archipielago-volcanico", "Archipiélago volcánico", "Mapas/Archipiélago Volcánico.jpg"],
];
const stem = (f) => f.replace(/.[a-z0-9]+$/i, "").toLowerCase();
const find = (rel) => {
  const dir = path.join(SRC, path.dirname(rel));
  const f = fs.readdirSync(dir).find((x) => stem(x) === stem(path.basename(rel)));
  if (!f) throw new Error("missing " + rel);
  return path.join(dir, f);
};
const fmtSize = (b) => (b / 1048576).toFixed(1) + " MB";
const out = { guides: [], posters: [], maps: [] };

async function item(group, id, title, rel, kind) {
  const src = find(rel);
  let file;
  if (kind === "pdf") {
    file = `/descargas/${id}.pdf`; fs.copyFileSync(src, path.join(DL, `${id}.pdf`));
    // the PDF has no image preview here: the card shows an icon
    out[group].push({ id, title, file, size: fmtSize(fs.statSync(src).size), type: "PDF", preview: null });
    return;
  }
  // print-quality JPEG (posters are huge PNGs) + a light preview for the page
  const jpg = await sharp(src).flatten({ background: "#000" }).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
  fs.writeFileSync(path.join(DL, `${id}.jpg`), jpg);
  const prev = await sharp(src).flatten({ background: "#000" }).resize({ width: 900, height: 900, fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
  fs.writeFileSync(path.join(PV, `${id}.webp`), prev);
  const meta = await sharp(prev).metadata();
  out[group].push({ id, title, file: `/descargas/${id}.jpg`, size: fmtSize(jpg.length), type: "JPG", preview: `/material/${id}.webp`, w: meta.width, h: meta.height });
}
for (const [id, t, rel] of guides) await item("guides", id, t, rel, "pdf");
for (const [id, t, rel] of posters) await item("posters", id, t, rel, "img");
for (const [id, t, rel] of maps) await item("maps", id, t, rel, "img");

// game summary images for the "El juego" page (light, shown on the page itself)
const varios = [["caracteristicas-swom", "Varios/Caracteristicas SWOM.png"], ["progresion-puntos-de-banda", "Varios/Progresión de Puntos de Banda.png"]];
out.game = [];
for (const [id, rel] of varios) {
  const buf = await sharp(find(rel)).resize({ width: 1100, withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
  fs.writeFileSync(path.join(PV, `${id}.webp`), buf);
  const m = await sharp(buf).metadata();
  out.game.push({ id, src: `/material/${id}.webp`, w: m.width, h: m.height });
}
fs.writeFileSync(path.join(ROOT, "src/content/official-files.json"), JSON.stringify(out, null, 1));
const dlSize = fs.readdirSync(DL).reduce((n, f) => n + fs.statSync(path.join(DL, f)).size, 0);
console.log("descargas:", fmtSize(dlSize), "| files:", fs.readdirSync(DL).length, "| previews:", fs.readdirSync(PV).length);
