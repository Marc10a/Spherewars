import Image from "next/image";
import Link from "next/link";
import { oneParam } from "@/lib/params";
import { staticMeta } from "@/lib/seo";
import { notFound } from "next/navigation";
import { dict, isLocale } from "@/lib/i18n";
import { listSellableProducts, searchAll, type SearchHit } from "@/lib/data";
import { buildCatalogue, searchCatalogue } from "@/lib/shop/catalogue";
import { shopReadiness } from "@/lib/shop/settings";
import { EntryStatus } from "@/components/shop/facts-ui";
import { chipCls, PageHero } from "@/components/ui";

export const generateMetadata = staticMeta({ title: (t) => t.search.title, description: (t) => t.pageMeta.search, path: "/buscar", noindex: true });

type HitType = SearchHit["type"] | "shop";

export default async function Page({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string | string[]; tipo?: string | string[] }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = dict[locale];
  const t = d.search;
  const query = await searchParams;
  const q = oneParam(query.q) ?? "";
  const tipo = oneParam(query.tipo);
  const active = q.trim().length >= 2;
  const [hits, products, ready] = await Promise.all([searchAll(locale, q), active ? listSellableProducts() : [], active ? shopReadiness() : null]);
  const shop = active ? searchCatalogue(buildCatalogue(products, locale), q.slice(0, 80)) : [];
  const groups = t.groups as Record<HitType, string>;
  const known = tipo && Object.hasOwn(groups, tipo);
  const shownShop = !known || tipo === "shop" ? shop : [];
  const shownOther = !known ? hits : hits.filter((h) => h.type === tipo);
  const total = shownShop.length + shownOther.length;
  const count = (ty: HitType) => (ty === "shop" ? shop.length : hits.filter((h) => h.type === ty).length);
  const chip = chipCls;
  const url = (ty?: string) => `/${locale}/buscar?q=${encodeURIComponent(q)}${ty ? `&tipo=${ty}` : ""}`;

  return (
    <>
      <PageHero title={t.title} />
      <div className="mx-auto max-w-3xl px-4 py-12">
        <form role="search" action={`/${locale}/buscar`} className="flex gap-2">
          <label htmlFor="q" className="sr-only">{t.label}</label>
          <input id="q" name="q" defaultValue={q} minLength={2} required className="min-w-0 flex-1 border border-gold/40 bg-coal px-3 py-3" placeholder={t.placeholder} />
          <button className="btn min-h-12 bg-gold px-5 font-display text-base text-abyss hover:bg-ivory">{t.button}</button>
        </form>

        {active && (
          <>
            <nav aria-label={t.filterAria} className="mt-6 flex flex-wrap gap-2">
              <Link href={url()} className={chip(!tipo)}>{t.all} ({hits.length + shop.length})</Link>
              {(Object.keys(groups) as HitType[]).map((ty) => (
                <Link key={ty} href={url(ty)} className={chip(tipo === ty)}>{groups[ty]} ({count(ty)})</Link>
              ))}
            </nav>
            <p role="status" className="mt-4 text-sm text-stone">{total} {t.results[total === 1 ? 0 : 1]}</p>
            <ul className="mt-2 divide-y divide-gold/10 border border-gold/20 bg-coal">
              {shownShop.map((e) => (
                <li key={e.key} data-faction={e.faction.theme}>
                  <Link href={e.href} className="flex items-center gap-4 p-4 transition-colors duration-150 hover:bg-gold/5">
                    {e.photo && <span className="spot relative h-20 w-16 shrink-0 overflow-hidden"><Image src={e.photo} alt="" fill sizes="64px" loading="lazy" className={e.isPack || !e.photoFills ? "object-contain" : "object-cover"} /></span>}
                    <span className="min-w-0 flex-1">
                      <span lang="es" className="block font-display text-lg leading-tight">{e.name}</span>
                      <span className="block text-sm text-stone">{groups.shop} · {e.isPack ? "Starter Pack · " : ""}{e.faction.name}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      {e.price && <span className="shop-num block font-display text-lg text-gold">{e.price}</span>}
                      <EntryStatus entry={e} t={d} open={Boolean(ready?.canCheckout)} className="block text-sm text-stone" />
                    </span>
                  </Link>
                </li>
              ))}
              {shownOther.map((h) => (
                <li key={h.type + h.href + h.title}>
                  <Link href={h.href} className="block p-4 hover:bg-gold/5">
                    <span className="font-display text-sm text-gold">{groups[h.type]}</span>
                    <span lang={h.lang ?? (h.type === "wiki" ? "es" : undefined)} className="block">{h.title}</span>
                    {h.detail && <span className="text-sm text-stone">{h.detail}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}
