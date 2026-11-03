// Reads the owner's «Descripciones Artículos» Word files and writes src/content/shop-products.json:
// official product text (intro, lore, technical sheet) for each miniature and each Starter Pack.
// Usage: node scripts/import-shop-docs.mjs <folder with the 4 extracted .txt files, one paragraph per line>
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
const ROOT = path.resolve(import.meta.dirname, "..");
const wiki = JSON.parse(fs.readFileSync(path.join(ROOT, "src/content/wiki.json"), "utf8"));
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const files = { Alianza: "alianza", Adeptos: "adeptos-de-malesur", Manadas: "manadas-de-urueh", "Vástagos": "vastagos-de-kurgan" };
const folder = { alianza: "alianza", "adeptos-de-malesur": "adeptos-de-malesur", "manadas-de-urueh": "mandas-de-urueh", "vastagos-de-kurgan": "vastagos-de-kurgan" };
const isIntro = (l) => /(es una miniatura de SphereWars|es un Starter Pack|son unas miniaturas de SphereWars|son miniaturas de SphereWars)/.test(l);
const out = {}, unmatched = [];

for (const [file, faction] of Object.entries(files)) {
  const lines = fs.readFileSync(path.join(dir, `${file}.txt`), "utf8").split(/\r?\n/).map((l) => l.replace(/^\uFEFF/, "").trim()).filter(Boolean);
  const starts = [];
  for (let i = 0; i < lines.length - 1; i++) if (isIntro(lines[i + 1]) && !isIntro(lines[i])) starts.push(i);
  starts.forEach((s, k) => {
    const block = lines.slice(s, starts[k + 1] ?? lines.length);
    const title = block[0].replace(/\s+/g, " ");
    const ci = block.findIndex((l) => l === "Características");
    const body = block.slice(1, ci > 0 ? ci : undefined);
    const tail = ci > 0 ? block.slice(ci + 1) : [];
    const specs = [];
    let closing = "";
    for (const l of tail) { const m = l.match(/^([^:]{2,40}):\s*(.+)$/); if (m && !closing) specs.push([m[1].trim(), m[2].trim()]); else closing = closing ? closing + " " + l : l; }
    const isPack = /starter pack/i.test(title);
    const items = isPack && body.includes("Contenido") ? body.slice(body.indexOf("Contenido") + 1) : [];
    const text = isPack && body.includes("Contenido") ? body.slice(0, body.indexOf("Contenido")) : body;
    // wiki page: same name once accents, case and the title after the comma are ignored
    let slug = null;
    if (isPack) slug = `packs/${faction}`;
    else {
      const t = norm(title.replace(/\(\d+\)/, "").replace(/\s*\(\d+ miniaturas\)/, ""));
      const pages = wiki.pages.filter((p) => p.slug.startsWith("personajes/" + folder[faction] + "/"));
      slug = pages.find((p) => norm(p.title) === t)?.slug ?? pages.find((p) => norm(p.title).startsWith(t) || t.startsWith(norm(p.title).split(" ")[0] + " ") && norm(p.title).split(" ")[0].length > 3 && norm(p.title).startsWith(t.split(" ")[0]))?.slug ?? null;
    }
    // the Cohort of Postulants (2 miniatures) is sold as one product; both wiki pages of its miniatures show it
    if (!slug && /^Cohorte de Postulantes/.test(title)) slug = "personajes/alianza/corazon-postulante";
    if (!slug) { unmatched.push(`${faction}: ${title}`); return; }
    out[slug] = { faction, title, ref: specs.find(([k]) => /referencia/i.test(k))?.[1] ?? null, intro: text[0], lore: text.slice(1), items, specs, closing };
  });
}
fs.writeFileSync(path.join(ROOT, "src/content/shop-products.json"), JSON.stringify({ _note: "Texto oficial de las descripciones de artículos (Descripciones Artículos .docx del propietario).", aliases: { "personajes/alianza/postulante-raso": "personajes/alianza/corazon-postulante" }, products: out }, null, 1));
console.log(Object.keys(out).length, "products");
console.log("unmatched:", unmatched);
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(48), v.ref ?? "-", "|", v.title);
