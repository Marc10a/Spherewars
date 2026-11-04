import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { factions } from "@/content/factions";
import type { Dict } from "@/lib/i18n";
import type { ShopEntry } from "@/lib/shop/catalogue";

/** Everything in the game without a price yet: closed by default, out of every count and out of the main grids. */
export function NotForSale({ entries, t }: { entries: ShopEntry[]; t: Dict }) {
  if (!entries.length) return null;
  const c = t.catalogue;
  const columns = factions.map((f) => ({ f, list: entries.filter((e) => e.faction.slug === f.slug) })).filter((g) => g.list.length);
  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-10">
      <details className="shelf border-y border-gold/25">
        <summary className="shelf-summary">
          <span className="font-display text-2xl text-ivory md:text-3xl">{c.notForSale} <span className="shop-num text-stone">({entries.length})</span></span>
          <ChevronDown size={22} aria-hidden className="shelf-chevron shrink-0 text-gold" />
        </summary>
        <div className="pb-8 pt-2">
          <p className="max-w-2xl text-ivory/85">{c.notForSaleLead}</p>
          <div className={`mt-6 grid gap-8 sm:grid-cols-2 ${columns.length > 2 ? "xl:grid-cols-4" : ""}`}>
            {columns.map(({ f, list }) => (
              <section key={f.slug} data-faction={f.theme} aria-label={f.name}>
                <h3 className="border-b border-accent/30 pb-2 font-display text-xl text-accent">{f.name} <span className="shop-num text-stone">({list.length})</span></h3>
                <ul lang="es" className="mt-1">
                  {list.map((e) => <li key={e.key}><Link href={e.href} className="shelf-link">{e.name}</Link></li>)}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </details>
    </div>
  );
}
