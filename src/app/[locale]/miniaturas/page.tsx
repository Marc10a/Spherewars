import Image from "next/image";
import { staticMeta } from "@/lib/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { dict, isLocale } from "@/lib/i18n";
import { factions } from "@/content/factions";
import { formatPrice, listProducts, mediaUrl } from "@/lib/data";
import { PageHero } from "@/components/ui";
import { factionCharacters } from "@/lib/wiki";
import { MiniCard } from "@/components/MiniCard";

export const generateMetadata = staticMeta({ title: (t) => t.minis.title, description: (t) => t.minis.lead, path: "/miniaturas" });

export default async function Page({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ faccion?: string; categoria?: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dict[locale].minis;
  const { faccion, categoria } = await searchParams;
  const products = await listProducts({ faction: faccion, category: categoria });
  const chip = (active: boolean) => `border px-3 py-1 text-xs uppercase tracking-widest ${active ? "border-gold bg-gold text-abyss" : "border-gold/40 text-ivory/80 hover:border-gold"}`;
  const href = (f?: string, c?: string) => `/${locale}/miniaturas${f || c ? "?" : ""}${[f && `faccion=${f}`, c && `categoria=${c}`].filter(Boolean).join("&")}`;

  return (
    <>
      <PageHero title={t.title} lead={t.lead} />
      <div className="mx-auto max-w-7xl px-4 py-12">
        <nav aria-label={t.filters} className="mb-8 grid gap-3">
          <div className="flex flex-wrap gap-2">
            <Link href={href(undefined, categoria)} className={chip(!faccion)}>{t.allFactions}</Link>
            {factions.map((f) => <Link key={f.slug} href={href(f.slug, categoria)} className={chip(faccion === f.slug)}>{f.name}</Link>)}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={href(faccion)} className={chip(!categoria)}>{t.allCats}</Link>
            {Object.entries(t.cats).map(([k, l]) => <Link key={k} href={href(faccion, k)} className={chip(categoria === k)}>{l}</Link>)}
          </div>
        </nav>

        {products.length === 0 ? (
          <section aria-label={t.charactersAria}>
            <p className="mb-6 max-w-2xl text-sm text-stone">{t.interim}</p>
            <div className="space-y-12">
              {(faccion ? factions.filter((f) => f.slug === faccion) : factions).map((f) => {
                const list = factionCharacters(f.slug);
                if (!list.length) return null;
                return (
                  <div key={f.slug}>
                    <h2 className="mb-5 font-display text-2xl text-accent" data-faction={f.theme}>{f.name} <span className="text-sm text-stone">({list.length})</span></h2>
                    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {list.map((c) => <li key={c.slug}><MiniCard page={c} locale={locale} theme={f.theme} /></li>)}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((p) => {
              const img = mediaUrl(p.image_path);
              const price = formatPrice(p.price_cents, p.currency, locale);
              return (
                <li key={p.id}>
                  <Link href={`/${locale}/miniaturas/${p.slug}`} data-faction={factions.find((f) => f.slug === p.factions?.slug)?.theme} className="tilt-card block border border-gold/20 bg-coal">
                    <div className="relative aspect-square bg-abyss">
                      {img && <Image src={img} alt={p.image_alt ?? p.name} fill sizes="(min-width:1024px) 25vw, 50vw" className="object-contain" />}
                    </div>
                    <div className="p-4">
                      <h2 className="font-display text-lg">{p.name}</h2>
                      <p className="text-xs uppercase tracking-widest text-accent">{factions.find((f) => f.slug === p.factions?.slug)?.name}</p>
                      {price && <p className="mt-1 text-sm text-stone">{price}</p>}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
