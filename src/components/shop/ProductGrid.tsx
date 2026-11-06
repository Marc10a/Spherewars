import Link from "next/link";
import type { Dict, Locale } from "@/lib/i18n";
import type { ShopEntry } from "@/lib/shop/catalogue";
import { factLine } from "./facts-ui";
import { ShopTile } from "./ShopTile";

const withPhoto = (e: ShopEntry): e is ShopEntry & { photo: string } => Boolean(e.photo);

/** Tiles for products with a photo. A product on sale still waiting for its photo gets a text row: never a placeholder tile. */
export function ProductGrid({ entries, t, locale, open, showFaction = false, priorityFirst = false }: { entries: ShopEntry[]; t: Dict; locale: Locale; open: boolean; showFaction?: boolean; priorityFirst?: boolean }) {
  const tiles = entries.filter(withPhoto);
  const rows = entries.filter((e) => !e.photo);
  return (
    <>
      <ul className="shop-grid grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
        {tiles.map((e, i) => <li key={e.key} className="flex"><ShopTile entry={e} t={t} locale={locale} open={open} showFaction={showFaction} priority={priorityFirst && i < 2} /></li>)}
      </ul>
      {rows.length > 0 && (
        <ul className="mt-4 divide-y divide-accent/15 border border-accent/20 bg-coal">
          {rows.map((e) => (
            <li key={e.key}>
              <Link href={e.href} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3 hover:bg-accent/5">
                <span lang="es" className="font-display text-lg">{e.name}</span>
                <span className="text-sm text-stone">{factLine(e, t)}</span>
                {e.price && <span className="shop-num font-display text-xl text-gold">{e.price}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
