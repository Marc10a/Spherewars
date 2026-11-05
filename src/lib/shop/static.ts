import raw from "@/content/prices.json";
import { factions } from "@/content/factions";
import docs from "@/content/shop-products.json";
import { factionCharacters, shopKey } from "@/lib/wiki";
import type { Product } from "@/lib/data";

/**
 * Prices of the owner's own price list (src/content/prices.json, from the 2026 quick guide), used while the shop has
 * no database or WooCommerce. A miniature that is not in the list has no price and stays "not available": nothing is invented.
 * Once WooCommerce (or the database) is connected, their products replace this list.
 */
const table = (raw as { prices: Record<string, { cents: number; sku: string | null }> }).prices;

export function staticProducts(): Product[] {
  return factions.flatMap((f) => [
    ...packProduct(f.slug),
    ...factionCharacters(f.slug).flatMap((m): Product[] => {
      const row = table[shopKey(m.slug)];
      if (!row) return [];
      const slug = m.slug.split("/").pop()!;
      return [{
        id: `static-${shopKey(m.slug).split("/").pop()}`, slug, name: m.title, category: "miniature", description: null, contents: null,
        price_cents: row.cents, currency: "EUR", commercial_status: "available", buy_url: null, profile_url: null,
        stock: null, sellable: true, wiki_slug: m.slug, image_path: null, image_alt: m.title, factions: { slug: f.slug },
      }];
    }),
  ]);
}

/** The Starter Pack of a faction (official name from the product documents, price from the price list). */
function packProduct(faction: string): Product[] {
  const key = `packs/${faction}`;
  const row = table[key];
  const doc = (docs.products as Record<string, { title: string }>)[key];
  if (!row || !doc) return [];
  return [{
    id: `static-pack-${faction}`, slug: "starter-pack", name: doc.title, category: "pack", description: null, contents: null,
    price_cents: row.cents, currency: "EUR", commercial_status: "available", buy_url: null, profile_url: null,
    stock: null, sellable: true, wiki_slug: key, image_path: null, image_alt: doc.title, factions: { slug: faction },
  }];
}
