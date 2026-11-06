import Image from "next/image";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { factions } from "@/content/factions";
import { dict, type Locale } from "@/lib/i18n";
import { countFor, shopHref, type CatalogueCounts, type ShopQuery, type ShopSort, type ShopType } from "@/lib/shop/catalogue";
import { ShopRail } from "./ShopRail";
import { SortMenu } from "./SortMenu";

const emblem = (slug: string) => `/brand/factions/${slug}.webp`;

/**
 * The catalogue filters. Faction cards pick the bando; a bar that stays under the header holds the type, the order, the live count
 * and the way back to everything. Every option is a link with its own URL, so any view can be shared and the WordPress export
 * (which stores each combination of ?orden= and ?tipo=) keeps working without JavaScript.
 */
export function ShopFilters({ locale, active, query, counts }: { locale: Locale; active: string | null; query: ShopQuery; counts: CatalogueCounts }) {
  const t = dict[locale];
  const c = t.catalogue;
  const unit = (n: number) => `${n} ${c.count[n === 1 ? 0 : 1]}`;
  const scope = active ? counts.byFaction[active] ?? { starter: 0, sueltas: 0 } : counts.all;
  const total = countFor(scope, query.tipo);
  const current = factions.find((f) => f.slug === active);
  const types: [ShopType | null, string][] = [[null, c.typeAll], ["starter", c.typeStarter], ["sueltas", c.typeSingles]];
  const sorts: [ShopSort | null, string, string][] = [[null, c.sortDefault, c.sortDefaultLong], ["precio", c.sortPrice, c.sortPriceAria], ["puntos", c.sortPoints, c.sortPointsAria]];
  const filtered = Boolean(active || query.tipo || query.orden);

  // The live count and the active filters with one-tap removal. Inside the sticky bar on wide screens; under it on phones, so the bar stays one row.
  const summary = (className: string) => (
    <div className={`flex-wrap items-center gap-x-3 gap-y-2 ${className}`}>
      <p role="status" className="shop-num font-display text-lg text-ivory">{unit(total)}</p>
      {current && (
        <Link href={shopHref(locale, null, query)} scroll={false} className="shop-bar-chip">
          <Image src={emblem(current.slug)} alt="" width={28} height={28} className="h-5 w-auto object-contain" />
          <span>{current.name}</span>
          <X size={16} aria-hidden className="shrink-0" />
          <span className="sr-only">: {c.removeFilter}</span>
        </Link>
      )}
      {query.orden && (
        <Link href={shopHref(locale, active, { ...query, orden: null })} scroll={false} className="shop-bar-chip">
          <span>{sorts.find(([v]) => v === query.orden)![1]}</span>
          <X size={16} aria-hidden className="shrink-0" />
          <span className="sr-only">: {c.removeFilter}</span>
        </Link>
      )}
      {filtered && <Link href={shopHref(locale, null, { tipo: null, orden: null })} scroll={false} className="shop-bar-clear">{c.clearFilters}</Link>}
    </div>
  );

  return (
    <>
      <nav aria-label={t.shop.factionsTitle} className="mx-auto max-w-7xl px-4 pt-5 md:pt-7">
        <ShopRail className="shop-picks">
          <li>
            <Link href={shopHref(locale, null, query)} scroll={false} aria-current={active === null ? "page" : undefined} className="shop-pick">
              <span className="shop-pick-crest" aria-hidden>
                {factions.map((f) => <Image key={f.slug} src={emblem(f.slug)} alt="" width={40} height={40} className="h-8 w-auto object-contain md:h-9" />)}
              </span>
              <span className="shop-pick-name">{t.shop.allShop}</span>
              <span className="shop-pick-n shop-num">{unit(countFor(counts.all, query.tipo))}</span>
              <Check size={18} aria-hidden className="shop-pick-check" />
            </Link>
          </li>
          {factions.map((f) => {
            const n = countFor(counts.byFaction[f.slug] ?? { starter: 0, sueltas: 0 }, query.tipo);
            return (
              <li key={f.slug}>
                <Link href={shopHref(locale, f.slug, query)} scroll={false} aria-current={active === f.slug ? "page" : undefined} data-faction={f.theme} data-empty={n === 0 ? "" : undefined} className="shop-pick">
                  <Image src={f.image} alt="" fill sizes="(min-width:768px) 20vw, 10rem" loading="lazy" className="shop-pick-art" />
                  <Image src={emblem(f.slug)} alt="" width={64} height={64} className="shop-pick-emblem" />
                  <span className="shop-pick-name">{f.name}</span>
                  <span className="shop-pick-n shop-num">{unit(n)}</span>
                  <Check size={18} aria-hidden className="shop-pick-check" />
                </Link>
              </li>
            );
          })}
        </ShopRail>
      </nav>

      <div className="shop-bar" data-faction={current?.theme}>
        <div className="mx-auto flex max-w-7xl items-center gap-x-3 px-4 py-2.5 md:gap-x-4">
          {summary("hidden min-w-0 flex-1 md:flex")}
          <div role="group" aria-label={c.type} className="shop-seg max-md:min-w-0 max-md:flex-1">
            {types.map(([v, label]) => (
              <Link key={label} scroll={false} prefetch={false} href={shopHref(locale, active, { ...query, tipo: v })} aria-current={query.tipo === v ? "true" : undefined} className={`shop-seg-item${query.tipo === v ? " is-on" : ""}`}>
                {label}<span className="shop-seg-n shop-num">{countFor(scope, v)}</span>
              </Link>
            ))}
          </div>
          <SortMenu
            active={Boolean(query.orden)}
            label={c.sortBy}
            current={sorts.find(([v]) => v === query.orden)![1]}
            options={sorts.map(([v, , long]) => ({ href: shopHref(locale, active, { ...query, orden: v }), label: long, on: query.orden === v }))}
          />
        </div>
      </div>
      {summary("mx-auto flex max-w-7xl px-4 pt-3 md:hidden")}
    </>
  );
}
