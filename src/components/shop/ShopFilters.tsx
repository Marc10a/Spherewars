import Link from "next/link";
import { ArrowDownNarrowWide } from "lucide-react";
import { chipCls } from "@/components/ui";
import { factions } from "@/content/factions";
import { dict, type Locale } from "@/lib/i18n";
import { shopHref, type ShopQuery, type ShopSort, type ShopType } from "@/lib/shop/catalogue";

/** Faction links plus type and order. All are plain links, so any filtered view has its own shareable URL. */
export function ShopFilters({ locale, active, query }: { locale: Locale; active: string | null; query: ShopQuery }) {
  const t = dict[locale];
  const c = t.catalogue;
  const seg = (on: boolean) => `shop-seg-item${on ? " is-on" : ""}`;
  const types: [ShopType | null, string][] = [[null, c.typeAll], ["starter", c.typeStarter], ["sueltas", c.typeSingles]];
  const sorts: [ShopSort | null, string, string | undefined][] = [[null, c.sortDefault, undefined], ["precio", c.sortPrice, c.sortPriceAria], ["puntos", c.sortPoints, c.sortPointsAria]];
  return (
    <div className="mx-auto max-w-7xl space-y-3 px-4 pt-6">
      <nav aria-label={t.shop.factionsTitle} className="shop-strip">
        <Link href={shopHref(locale, null, query)} aria-current={active === null ? "page" : undefined} className={`${chipCls(active === null)} shrink-0 ${active === null ? "max-md:order-first" : ""}`}>{t.shop.allShop}</Link>
        {factions.map((f) => (
          <Link key={f.slug} href={shopHref(locale, f.slug, query)} aria-current={active === f.slug ? "page" : undefined} className={`${chipCls(active === f.slug)} shrink-0 ${active === f.slug ? "max-md:order-first" : ""}`}>{f.name}</Link>
        ))}
      </nav>
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:gap-x-8">
        <div role="group" aria-labelledby="shop-type" className="shop-seg">
          <span id="shop-type" className="shop-seg-label">{c.type}</span>
          {types.map(([v, label]) => (
            <Link key={label} scroll={false} prefetch={false} href={shopHref(locale, active, { ...query, tipo: v })} aria-current={query.tipo === v ? "true" : undefined} className={seg(query.tipo === v)}>{label}</Link>
          ))}
        </div>
        <div role="group" aria-labelledby="shop-sort" className="shop-seg">
          <span id="shop-sort" className="shop-seg-label">{c.sort}</span>
          {sorts.map(([v, label, aria]) => (
            <Link key={label} scroll={false} prefetch={false} href={shopHref(locale, active, { ...query, orden: v })} aria-label={aria} aria-current={query.orden === v ? "true" : undefined} className={seg(query.orden === v)}>
              {label}{v && <ArrowDownNarrowWide size={15} aria-hidden className="shrink-0" />}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
