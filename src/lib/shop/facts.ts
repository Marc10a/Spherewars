import docs from "@/content/shop-products.json";
import en from "@/content/shop-products.en.json";
import ca from "@/content/shop-products.ca.json";
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

type Translation = { specs: { labels: Record<string, string>; values: Record<string, string> }; products: Record<string, { intro: string; lore: string[]; closing: string | null }> };
/** English and Catalan versions of the official texts: machine-assisted, pending the owner's validation (see the files' `_note`). */
const translations: Record<string, Translation> = { en: en as unknown as Translation, ca: ca as unknown as Translation };

export type ProductCopy = { intro: string; lore: string[]; closing: string | null; /** Language the text is actually in. */ lang: string };

/** The product's story texts in the visitor's language, falling back to the official Spanish. Names inside stay as written. */
export function productCopy(key: string, locale: string): ProductCopy | null {
  const k = shopKey(key);
  const d = products[k];
  if (!d) return null;
  const tr = translations[locale]?.products[k];
  if (tr?.intro) return { intro: tr.intro, lore: tr.lore ?? [], closing: tr.closing ?? null, lang: locale };
  return { intro: d.intro, lore: Array.isArray(d.lore) ? d.lore : [], closing: typeof d.closing === "string" ? d.closing : null, lang: "es" };
}

/** A spec row in the visitor's language: known labels and fixed values are translated, codes and names stay. */
export function specText({ label, value }: Spec, locale: string) {
  const tr = translations[locale]?.specs;
  const v = tr?.values[value];
  // Untranslated values (codes, names) keep lang="es" on a translated page.
  return { label: tr?.labels[label] ?? label, value: v ?? value, valueLang: tr && !v ? "es" : undefined, labelLang: tr && !tr.labels[label] ? "es" : undefined };
}
