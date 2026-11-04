import docs from "@/content/shop-products.json";
import { shopKey } from "@/lib/wiki";

type Spec = { label: string; value: string };
type Doc = { faction: string; title: string; ref: string | null; intro: string; lore: string[]; specs: unknown; closing: unknown; items?: unknown };

const products = docs.products as unknown as Record<string, Doc>;

const specList = (raw: unknown): Spec[] => {
  if (Array.isArray(raw)) return raw.flatMap((r) => (Array.isArray(r) ? [{ label: String(r[0]), value: String(r[1]) }] : r && typeof r === "object" ? [{ label: String((r as Record<string, unknown>).label ?? (r as Record<string, unknown>).name ?? ""), value: String((r as Record<string, unknown>).value ?? "") }] : []));
  return raw && typeof raw === "object" ? Object.entries(raw as Record<string, unknown>).map(([label, value]) => ({ label, value: String(value) })) : [];
};

export type ProductFacts = {
  key: string;
  faction: string;
  title: string;
  /** Name without the model count, e.g. "Leva Demontre". */
  name: string;
  ref: string | null;
  /** Models in the box when the official title says so, e.g. "Leva Demontre (3)". Packs: read `items`. */
  models: number | null;
  intro: string;
  specs: Spec[];
  /** Pack contents exactly as in the owner's document. */
  items: string[];
  isPack: boolean;
};

/** Official product facts (owner's documents), keyed by wiki slug or `packs/<faction>`. Null when there is no document: never fill the gap. */
export function productFacts(key: string): ProductFacts | null {
  const k = shopKey(key);
  const d = products[k];
  if (!d) return null;
  const m = d.title.match(/^(.*?)\s*\((\d+)\)\s*$/);
  const items = Array.isArray(d.items) ? d.items.map((i) => (typeof i === "string" ? i : Array.isArray(i) ? i.join(" ") : String((i as Record<string, unknown>).name ?? (i as Record<string, unknown>).title ?? ""))).filter(Boolean) : [];
  return { key: k, faction: d.faction, title: d.title, name: m ? m[1] : d.title, ref: d.ref, models: m ? Number(m[2]) : null, intro: d.intro, specs: specList(d.specs), items, isPack: k.startsWith("packs/") };
}
