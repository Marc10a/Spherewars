// Writes wordpress/productos-woocommerce.csv: every product with a price (miniatures and Starter Packs) from the owner's
// price list and product documents, ready for WooCommerce > Productos > Importar. English column names are the ones WooCommerce
// always recognises. The Cohort of Postulants is one product (its second wiki page is an alias, so it is listed once).
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const prices = JSON.parse(fs.readFileSync(path.join(ROOT, "src/content/prices.json"), "utf8")).prices;
const docs = JSON.parse(fs.readFileSync(path.join(ROOT, "src/content/shop-products.json"), "utf8"));
const factionName = { "adeptos-de-malesur": "Adeptos de Malesur", "manadas-de-urueh": "Manadas de Urueh", "vastagos-de-kurgan": "Vástagos de Kurgan", alianza: "Alianza" };
const q = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
const rows = [["Type", "SKU", "Name", "Published", "Short description", "Regular price", "Categories", "Meta: sw_wiki_slug"].map(q).join(",")];
for (const [slug, v] of Object.entries(prices)) {
  if (docs.aliases[slug]) continue;
  const d = docs.products[slug];
  if (!d) continue;
  const faction = d.faction;
  const cats = slug.startsWith("packs/") ? `${factionName[faction]}, Starter Packs` : factionName[faction];
  rows.push(["simple", v.sku ?? "", d.title.replace(/\s*\(\d+\)$/, ""), 1, d.intro, (v.cents / 100).toFixed(2), cats, slug].map(q).join(","));
}
fs.writeFileSync(path.join(ROOT, "wordpress", "productos-woocommerce.csv"), "\ufeff" + rows.join("\r\n") + "\r\n");
console.log(rows.length - 1, "products");
