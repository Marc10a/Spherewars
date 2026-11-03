import { notFound } from "next/navigation";
import { dict, isLocale, locales } from "@/lib/i18n";
import { factions, getFaction } from "@/content/factions";
import { shopReadiness } from "@/lib/shop/settings";
import { factionCharacters } from "@/lib/wiki";
import { groupBySubfaction } from "@/lib/minigroups";
import { pageMeta } from "@/lib/seo";
import { PageHero, Section } from "@/components/ui";
import { ShopTile } from "@/components/shop/ShopTile";
import { PackTile } from "@/components/shop/PackTile";
import { packFor } from "@/lib/shop/packs";
import { ShopFilters } from "@/components/shop/ShopFilters";

export const generateStaticParams = () => locales.flatMap((locale) => factions.map((f) => ({ locale, faccion: f.slug })));

export async function generateMetadata({ params }: { params: Promise<{ locale: string; faccion: string }> }) {
  const { locale, faccion } = await params;
  const f = getFaction(faccion);
  const l = isLocale(locale) ? locale : "es";
  return f ? pageMeta({ title: `${dict[l].shop.title} · ${f.name}`, description: f.blurb[l], path: `/tienda/${f.slug}`, image: f.image }, locale) : {};
}

export default async function Page({ params }: { params: Promise<{ locale: string; faccion: string }> }) {
  const { locale, faccion } = await params;
  const f = getFaction(faccion);
  if (!isLocale(locale) || !f) notFound();
  const t = dict[locale];
  const ready = await shopReadiness();
  const pack = packFor(f.slug);
  const groups = groupBySubfaction(f, factionCharacters(f.slug), t.factions.leadersTitle).filter((g) => g.pages.length);

  return (
    <div data-faction={f.theme}>
      <PageHero title={f.name} theme={f.theme} image={f.image} />
      <div className="mx-auto max-w-7xl px-4 pt-8">
        {!ready.canCheckout && <p role="note" className="border border-dashed border-gold/40 bg-coal/60 p-4 text-sm text-stone">{t.shop.closed}</p>}
        <ShopFilters locale={locale} active={f.slug} />
      </div>
      <Section title={t.factions.minisTitle} compact>
        <div className="space-y-10">
          {pack && (
            <ul className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
              <li><PackTile pack={pack} theme={f.theme} priority href={`/${locale}/tienda/${f.slug}/starter-pack`} /></li>
            </ul>
          )}
          {groups.map((g) => (
            <div key={g.name ?? "all"}>
              {g.name && <h3 className="mb-4 font-display text-2xl text-accent">{g.name} <span className="text-sm text-stone">({g.pages.length})</span></h3>}
              <ul className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
                {g.pages.map((m, i) => (
                  <li key={m.slug}><ShopTile page={m} theme={f.theme} locale={locale} priority={i < 4} href={`/${locale}/tienda/${f.slug}/${m.slug.split("/").pop()}`} /></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
