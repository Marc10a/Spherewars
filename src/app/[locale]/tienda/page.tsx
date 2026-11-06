import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { dict, isLocale } from "@/lib/i18n";
import { staticMeta } from "@/lib/seo";
import { factions } from "@/content/factions";
import { shopReadiness } from "@/lib/shop/settings";
import { listSellableProducts } from "@/lib/data";
import { buildCatalogue, catalogueCounts, parseShopQuery, shopHref, sortEntries } from "@/lib/shop/catalogue";
import { CatalogueEmpty } from "@/components/shop/CatalogueEmpty";
import { NotForSale } from "@/components/shop/NotForSale";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { ShopFilters } from "@/components/shop/ShopFilters";
import { ShopHero } from "@/components/shop/ShopHero";
import { StarterCompare } from "@/components/shop/StarterCompare";

export const generateMetadata = staticMeta({ title: (t) => t.shop.title, description: (t) => t.shop.lead, path: "/tienda" });

/** Shop home: compare the Starter Packs, then what can be bought per faction, and last (closed) what is not on sale yet. */
export default async function Page({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ tipo?: string | string[]; orden?: string | string[] }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dict[locale];
  const c = t.catalogue;
  const query = parseShopQuery(await searchParams);
  const [ready, products] = await Promise.all([shopReadiness(), listSellableProducts()]);
  const open = ready.canCheckout;
  const catalogue = buildCatalogue(products, locale);
  const { packs, singles, unlisted } = catalogue;
  const counts = catalogueCounts(catalogue);
  const onSale = packs.filter((p) => p.status !== "unlisted").length + singles.length;
  const showSingles = query.tipo !== "starter";

  return (
    <>
      <ShopHero t={t} title={t.shop.title} image="/wiki/images/portada_manadas_retrato_infernal_bajo_el_volc_n.webp" count={onSale} open={open} locale={locale} />
      <ShopFilters locale={locale} active={null} query={query} counts={counts} />
      {/* Keyed by the filters: the results swap in with a short entrance (none with reduced motion). */}
      <div key={`${query.tipo}-${query.orden}`} className="shop-results">
      {query.tipo !== "sueltas" && <StarterCompare packs={packs} t={t} open={open} locale={locale} orden={query.orden} />}
      {showSingles && (query.orden ? (
        <section aria-labelledby="all-singles" className="mx-auto max-w-7xl px-4 pt-12 md:pt-16">
          <h2 id="all-singles" className="mb-5 font-display text-3xl tracking-wide md:text-4xl">{c.singles} <span className="shop-num text-stone">({singles.length})</span></h2>
          <ProductGrid entries={sortEntries(singles, query.orden)} t={t} locale={locale} open={open} showFaction />
        </section>
      ) : factions.map((f) => {
        const list = singles.filter((e) => e.faction.slug === f.slug);
        if (!list.length) return null;
        return (
          <section key={f.slug} id={f.slug} data-faction={f.theme} aria-labelledby={`h-${f.slug}`} className="mx-auto max-w-7xl px-4 pt-12 md:pt-16">
            <div className="shop-sec-head">
              <Image src={`/brand/factions/${f.slug}.webp`} alt="" width={64} height={64} loading="lazy" className="h-12 w-auto shrink-0 object-contain md:h-14" />
              <h2 id={`h-${f.slug}`} className="min-w-0 flex-1 font-display text-3xl tracking-wide text-accent md:text-4xl">{f.name}</h2>
              <div className="flex items-center justify-between gap-4 max-sm:w-full">
                <p className="shop-num whitespace-nowrap text-base text-stone">{list.length} {c.count[list.length === 1 ? 0 : 1]}</p>
                <Link href={shopHref(locale, f.slug, query)} className="shop-arrow-link">{c.viewFaction}<span className="sr-only">: {f.name}</span><ArrowRight size={18} aria-hidden /></Link>
              </div>
            </div>
            <ProductGrid entries={list} t={t} locale={locale} open={open} />
          </section>
        );
      }))}
      {showSingles && !singles.length && (
        <div className="mx-auto max-w-7xl px-4 pt-12">
          <CatalogueEmpty text={c.noSingles} actions={[{ href: shopHref(locale, null, { ...query, tipo: "starter" }), label: c.startHere, solid: true }]} />
        </div>
      )}
      </div>
      {showSingles ? <NotForSale entries={unlisted} t={t} /> : <div className="pb-16" />}
    </>
  );
}
