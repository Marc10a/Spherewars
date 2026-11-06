import { notFound } from "next/navigation";
import { dict, isLocale, locales } from "@/lib/i18n";
import { factions, getFaction } from "@/content/factions";
import { shopReadiness } from "@/lib/shop/settings";
import { pageMeta } from "@/lib/seo";
import { listSellableProducts } from "@/lib/data";
import { buildCatalogue, catalogueCounts, parseShopQuery, shopHref, sortEntries, type ShopEntry } from "@/lib/shop/catalogue";
import { CatalogueEmpty } from "@/components/shop/CatalogueEmpty";
import { NotForSale } from "@/components/shop/NotForSale";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { ShopFilters } from "@/components/shop/ShopFilters";
import { ShopHero } from "@/components/shop/ShopHero";
import { StarterBlock } from "@/components/shop/StarterBlock";

export const generateStaticParams = () => locales.flatMap((locale) => factions.map((f) => ({ locale, faccion: f.slug })));

export async function generateMetadata({ params }: { params: Promise<{ locale: string; faccion: string }> }) {
  const { locale, faccion } = await params;
  const f = getFaction(faccion);
  const l = isLocale(locale) ? locale : "es";
  return f ? pageMeta({ title: `${dict[l].shop.title} · ${f.name}`, description: f.blurb[l], path: `/tienda/${f.slug}`, image: f.image }, locale) : {};
}

/** A faction's shop: its Starter Pack first, then its subfactions where they exist, then the singles. */
export default async function Page({ params, searchParams }: { params: Promise<{ locale: string; faccion: string }>; searchParams: Promise<{ tipo?: string | string[]; orden?: string | string[] }> }) {
  const { locale, faccion } = await params;
  const f = getFaction(faccion);
  if (!isLocale(locale) || !f) notFound();
  const t = dict[locale];
  const c = t.catalogue;
  const query = parseShopQuery(await searchParams);
  const [ready, products] = await Promise.all([shopReadiness(), listSellableProducts()]);
  const open = ready.canCheckout;
  // The whole catalogue, for the counts on the faction cards; this page shows its own faction's part.
  const all = buildCatalogue(products, locale);
  const counts = catalogueCounts(all);
  const mine = (e: ShopEntry) => e.faction.slug === f.slug;
  const [packs, singles, unlisted] = [all.packs.filter((p) => mine(p) && p.status !== "unlisted"), all.singles.filter(mine), all.unlisted.filter(mine)];
  const onSale = packs.filter((p) => p.status !== "unlisted").length + singles.length;
  const groups = [
    ...(f.subfactions ?? []).map((s) => ({ name: s.name, note: s.note[locale], list: singles.filter((e) => e.subfaction === s.name) })),
    { name: c.singles, note: null, list: singles.filter((e) => !f.subfactions?.some((s) => s.name === e.subfaction)) },
  ].filter((g) => g.list.length);
  const isSub = (name: string) => f.subfactions?.some((s) => s.name === name);

  return (
    <div data-faction={f.theme}>
      <ShopHero t={t} title={f.name} theme={f.theme} image={f.image} emblem={`/brand/factions/${f.slug}.webp`} lead={f.style[locale]} count={onSale} open={open} locale={locale} />
      <ShopFilters locale={locale} active={f.slug} query={query} counts={counts} />
      <div key={`${query.tipo}-${query.orden}`} className="shop-results mx-auto max-w-7xl space-y-12 px-4 pt-8 md:space-y-16 md:pt-12">
        {query.tipo !== "sueltas" && packs[0] && <StarterBlock entry={packs[0]} t={t} open={open} locale={locale} />}
        {query.tipo !== "starter" && groups.map((g) => (
          <section key={g.name} aria-label={g.name}>
            <div className="shop-sec-head">
              <h2 lang={isSub(g.name) ? "es" : undefined} className="min-w-0 flex-1 font-display text-3xl tracking-wide text-accent">{g.name}</h2>
              <p className="shop-num whitespace-nowrap text-base text-stone">{g.list.length} {c.count[g.list.length === 1 ? 0 : 1]}</p>
              {g.note && <p className="w-full text-ivory/85">{g.note}</p>}
            </div>
            <ProductGrid entries={sortEntries(g.list, query.orden)} t={t} locale={locale} open={open} />
          </section>
        ))}
        {query.tipo !== "starter" && !groups.length && (
          <CatalogueEmpty text={t.shop.noneForSale} emblem={`/brand/factions/${f.slug}.webp`} actions={[
            ...(packs[0] && query.tipo === "sueltas" ? [{ href: shopHref(locale, f.slug, { ...query, tipo: "starter" as const }), label: c.viewPack, solid: true }] : []),
            { href: shopHref(locale, null, query), label: c.emptyAll },
          ]} />
        )}
        {query.tipo === "starter" && !packs[0] && <CatalogueEmpty text={c.emptyFiltered} actions={[{ href: shopHref(locale, f.slug, { ...query, tipo: null }), label: c.clearFilters, solid: true }]} />}
      </div>
      {query.tipo !== "starter" ? <NotForSale entries={unlisted} t={t} /> : <div className="pb-16" />}
    </div>
  );
}
