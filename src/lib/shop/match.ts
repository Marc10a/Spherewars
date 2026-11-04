// Pure helpers that link wiki miniatures to shop products. Unit tested in scripts/test-shop.mjs and scripts/test-woo.mjs.
import docs from "../../content/shop-products.json" with { type: "json" };

const aliases = docs.aliases as Record<string, string>;
/** Two wiki pages can be one product (postulante-raso is sold as corazon-postulante): same table as shopKey in lib/wiki. */
const canonical = (key: string) => aliases[key] ?? key;

export type Linkable = { id: string; slug: string; wiki_slug: string | null };

/**
 * The product sold for a wiki miniature. Explicit link first (`wiki_slug`); otherwise, for products with no explicit link,
 * a product whose own slug equals the last segment of the wiki page ("satanor" for "personajes/mandas-de-urueh/satanor").
 * Aliases count as the same page. A Starter Pack (`packs/<faction>`) needs the explicit link: its last segment is a faction, not a product.
 */
export function productForMiniature<P extends Linkable>(products: P[], wikiSlug: string): P | undefined {
  const key = canonical(wikiSlug);
  const linked = products.find((p) => p.wiki_slug === wikiSlug) ?? products.find((p) => p.wiki_slug !== null && canonical(p.wiki_slug) === key);
  if (linked || wikiSlug.startsWith("packs/")) return linked;
  const names = [wikiSlug, key].map((k) => k.split("/").pop());
  return products.find((p) => !p.wiki_slug && names.includes(p.slug));
}

/** Products of a faction that are NOT tied to one of its wiki miniatures (starter packs, accessories, extras). */
export function extraProducts<P extends Linkable>(factionProducts: P[], miniatureSlugs: string[]): P[] {
  const matched = new Set<string>();
  for (const slug of miniatureSlugs) {
    const p = productForMiniature(factionProducts, slug);
    if (p) matched.add(p.id);
  }
  return factionProducts.filter((p) => !matched.has(p.id));
}
