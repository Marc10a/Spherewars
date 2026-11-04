import { notFound } from "next/navigation";
import { dict, isLocale } from "@/lib/i18n";
import { staticMeta } from "@/lib/seo";
import { factions } from "@/content/factions";
import { shopReadiness } from "@/lib/shop/settings";
import { factionCharacters } from "@/lib/wiki";
import { PageHero, Section } from "@/components/ui";
import { ShopTile } from "@/components/shop/ShopTile";
import { PackTile } from "@/components/shop/PackTile";
import { formatPrice, listSellableProducts } from "@/lib/data";
import { productForMiniature } from "@/lib/shop/match";
import { packFor } from "@/lib/shop/packs";
import { ShopFilters } from "@/components/shop/ShopFilters";

export const generateMetadata = staticMeta({ title: (t) => t.shop.title, description: (t) => t.shop.lead, path: "/tienda" });

/** Shop home: every miniature as a photo + name card, with the faction filters. Price and buying happen on each product page. */
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dict[locale];
  const ready = await shopReadiness();
  const products = await listSellableProducts();
  const priceOf = (key: string) => {
    const p = productForMiniature(products, key);
    return p?.sellable && p.price_cents ? formatPrice(p.price_cents, p.currency, locale) : null;
  };
  const items = factions.flatMap((f) => factionCharacters(f.slug).map((page) => ({ f, page })));

  return (
    <>
      <PageHero title={t.shop.title} lead={t.shop.lead} />
      <div className="mx-auto max-w-7xl px-4 pt-8">
        {!ready.canCheckout && <p role="note" className="border border-dashed border-gold/40 bg-coal/60 p-4 text-sm text-stone">{t.shop.closed}</p>}
        <ShopFilters locale={locale} active={null} />
      </div>
      <Section title={t.home.step2Title} lead={t.home.step2Text} compact>
        <ul className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
          {factions.flatMap((f) => { const pk = packFor(f.slug); return pk ? [<li key={pk.key}><PackTile price={priceOf(pk.key)} pack={pk} theme={f.theme} href={`/${locale}/tienda/${f.slug}/starter-pack`} /></li>] : []; })}
        </ul>
      </Section>
      <Section title={t.shop.allProducts} compact>
        <ul className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
          {items.map(({ f, page }, i) => (
            <li key={page.slug}><ShopTile price={priceOf(page.slug)} page={page} theme={f.theme} locale={locale} priority={i < 4} href={`/${locale}/tienda/${f.slug}/${page.slug.split("/").pop()}`} /></li>
          ))}
        </ul>
      </Section>
    </>
  );
}
