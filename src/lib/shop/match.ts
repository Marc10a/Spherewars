// Pure helpers (no imports) that link wiki miniatures to shop products. Unit tested in scripts/test-shop.mjs.

export type Linkable = { id: string; slug: string; wiki_slug: string | null };

/**
 * The product sold for a wiki miniature. Explicit link first (`wiki_slug`); otherwise, for products with no explicit link,
 * a product whose own slug equals the last segment of the wiki page ("satanor" for "personajes/mandas-de-urueh/satanor").
 */
export function productForMiniature<P extends Linkable>(products: P[], wikiSlug: string): P | undefined {
  const last = wikiSlug.split("/").pop();
  return products.find((p) => p.wiki_slug === wikiSlug) ?? products.find((p) => !p.wiki_slug && p.slug === last);
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
