import docs from "@/content/shop-products.json";
import shopPhotos from "@/content/shop-photos.json";

export type Pack = { faction: string; key: string; title: string; image: string | null };

const products = docs.products as Record<string, { title: string }>;
const photos = shopPhotos.photos as Record<string, { tile: string }>;

/** The Starter Pack of a faction, if the owner's documents describe one. Its shop page is /tienda/<faction>/starter-pack. */
export function packFor(faction: string): Pack | null {
  const key = `packs/${faction}`;
  const doc = products[key];
  return doc ? { faction, key, title: doc.title, image: photos[key]?.tile ?? null } : null;
}
