import type { Dict } from "@/lib/i18n";
import type { ShopEntry } from "@/lib/shop/catalogue";

const plural = (n: number, forms: readonly string[]) => forms[n === 1 ? 0 : 1];

export const pointsText = (e: ShopEntry, t: Dict) => (e.points ? e.points.replace(/ [ou] /, ` ${t.catalogue.or} `) : null);

/** "16 puntos · 2 miniaturas": only what the official document says. */
export function factLine(e: ShopEntry, t: Dict) {
  const c = t.catalogue;
  const points = pointsText(e, t);
  return [
    points && `${points} ${plural(parseInt(points, 10), c.pointsUnit)}`,
    e.models && `${e.models} ${plural(e.models, c.modelsUnit)}`,
  ].filter(Boolean).join(" · ");
}

/** Pack contents as in the document, with the count in the reader's language. */
export const itemText = (item: string, t: Dict) => item.replace(/\((\d+) miniaturas\)/, (_, n) => `(${n} ${t.catalogue.modelsUnit[1]})`);

/** Status as text. A closed shop has a single notice at the top of the page, so "available" is not repeated there. */
export function EntryStatus({ entry, t, open, className }: { entry: ShopEntry; t: Dict; open: boolean; className?: string }) {
  if (entry.status === "soldOut") return <span className={className}>{t.shop.soldOut}</span>;
  if (entry.status === "unlisted") return <span className={className}>{t.catalogue.notForSale}</span>;
  return open ? <span className={className}>{t.catalogue.available}</span> : null;
}
