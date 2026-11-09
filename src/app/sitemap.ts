import type { MetadataRoute } from "next";
import { activeLocales } from "@/lib/i18n";
import { factions } from "@/content/factions";
import { factionCharacters, wikiPages } from "@/lib/wiki";
import { packFor } from "@/lib/shop/packs";

import { siteUrl as base } from "@/lib/seo";
const paths = ["", "/juego", "/facciones", "/wikisphere", "/miniaturas", "/genera-tu-banda", "/eventos", "/comunidad", "/tienda", "/tienda/a-escala", "/juega-gratis", "/descargas", ...factions.map((f) => `/tienda/${f.slug}`),...factions.map((f) => `/facciones/${f.slug}`),
  ...factions.flatMap((f) => (packFor(f.slug) ? [`/tienda/${f.slug}/starter-pack`] : [])),
  ...factions.flatMap((f) => factionCharacters(f.slug).map((m) => `/tienda/${f.slug}/${m.slug.split("/").pop()}`))];
const wikiPaths = wikiPages.map((p) => `/wikisphere/${p.slug}`);

export default function sitemap(): MetadataRoute.Sitemap {
  // Wiki articles exist only in Spanish: listed once, without hreflang alternates.
  const wiki = wikiPaths.map((p) => ({ url: `${base}/es${p}` }));
  return [...wiki, ...paths.flatMap((p) =>
    activeLocales.map((l) => ({
      url: `${base}/${l}${p}`,
      alternates: { languages: Object.fromEntries(activeLocales.map((x) => [x, `${base}/${x}${p}`])) },
    })),
  )];
}
