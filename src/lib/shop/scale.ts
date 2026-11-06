import type { Dict } from "@/lib/i18n";
import { productFacts } from "@/lib/shop/facts";
import { ownerPhotos, shopKey } from "@/lib/wiki";
import { cutoutSizes } from "@/components/shop/cutout-sizes";
import { toMm, type Figure } from "@/components/shop/ScaleLineup";

/** Official figures in the reader's language: "3,9 cm" -> "3.9 cm" in English, "13 u 11" -> "13 or 11". Names stay as written. */
export const localNum = (v: string, locale: string, t: Dict) => (locale === "en" ? v.replace(/(\d),(\d)/g, "$1.$2") : v).replace(/^(\d+) [ou] (\d+)$/, `$1 ${t.catalogue.or} $2`);

/** The owner's cut-out photo of a miniature (transparent background), or null. */
export const cutoutOf = (key: string) => ownerPhotos(key)?.gallery.find((g) => g.kind === "clean")?.src ?? null;

/**
 * A miniature ready to be drawn to scale: official height (Altura) as a plain measure, a cut-out photo and its measured box.
 * Null when any of the three is missing: the height is never estimated and no other photo stands in.
 */
export function scaleFigure(slug: string, href: string, locale: string, t: Dict, fallbackName = ""): Figure | null {
  const facts = productFacts(slug);
  const heightText = facts?.specs.find((x) => x.label === "Altura")?.value ?? null;
  const heightMm = toMm(heightText);
  const src = cutoutOf(slug);
  const size = src ? cutoutSizes[src] : null;
  if (!facts || !heightMm || !heightText || !src || !size) return null;
  return { key: shopKey(slug), name: facts.name ?? fallbackName, heightMm, heightText: localNum(heightText, locale, t), src, size, href };
}

export type ScaleOrder = "altura" | null;

/** The to-scale view. Same rule as shopHref: parameters in alphabetical order, so the WordPress export finds each view under one URL. */
export function scaleHref(locale: string, faccion: string | null, orden: ScaleOrder = null) {
  const qs = new URLSearchParams();
  if (faccion) qs.set("faccion", faccion);
  if (orden) qs.set("orden", orden);
  const s = qs.toString();
  return `/${locale}/tienda/a-escala${s ? `?${s}` : ""}`;
}

/** Anchor of a miniature in the to-scale view (by product key), so the product page can link straight to it. */
export const scaleAnchor = (key: string) => `m-${shopKey(key).split("/").pop()}`;
