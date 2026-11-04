import Image from "next/image";
import { staticMeta } from "@/lib/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { dict, isLocale } from "@/lib/i18n";
import { listArticles } from "@/lib/data";
import { searchWiki, wikiCategories, wikiPages } from "@/lib/wiki";
import { PageHero } from "@/components/ui";

export const generateMetadata = staticMeta({ title: (t) => t.wiki.title, description: (t) => t.wiki.lead, path: "/wikisphere" });

export default async function Page({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ categoria?: string; q?: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dict[locale];
  const w = t.wiki;
  const { categoria, q } = await searchParams;
  const pages = searchWiki(q, categoria);
  const extra = await listArticles(locale, { q }); // editorial articles from the CMS, if any
  const total = pages.length + extra.length;
  const chip = (active: boolean) => `border px-3 py-1 text-xs uppercase tracking-widest ${active ? "border-gold bg-gold text-abyss" : "border-gold/40 text-ivory/80 hover:border-gold"}`;

  return (
    <>
      <PageHero title={w.title} lead={w.lead} />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 lg:grid-cols-[16rem_1fr]">
        <aside className="space-y-6">
          <form role="search" action={`/${locale}/wikisphere`}>
            <label htmlFor="q" className="text-xs uppercase tracking-widest text-gold">{w.searchLabel}</label>
            <input id="q" name="q" defaultValue={q} className="mt-2 w-full border border-gold/40 bg-coal px-3 py-2" />
            {categoria && <input type="hidden" name="categoria" value={categoria} />}
          </form>
          <nav aria-label={w.categories} className="flex flex-wrap gap-2 lg:flex-col lg:items-start">
            <Link href={`/${locale}/wikisphere`} className={chip(!categoria)}>{w.all} ({wikiPages.length})</Link>
            {wikiCategories.map((c) => (
              <Link key={c.slug} href={`/${locale}/wikisphere?categoria=${c.slug}`} className={chip(categoria === c.slug)}>{w.cat[c.slug] ?? c.name} ({c.count})</Link>
            ))}
          </nav>
        </aside>

        <div>
          {locale !== "es" && <p role="note" className="mb-6 border border-gold/30 bg-coal p-3 text-sm text-stone">{t.common.spanishOnly}</p>}
          {!q && !categoria && (
            <figure className="mb-8 border border-gold/30 bg-coal">
              <Image src="/wiki/images/mapa_saphir_2026.webp" alt={w.mapCaption} width={1600} height={1000} loading="lazy" className="h-auto w-full" />
              <figcaption className="p-3 text-xs uppercase tracking-widest text-stone">{w.mapCaption} · <Link lang="es" className="text-gold underline" href={`/${locale}/wikisphere/lugares/saphir`}>Esfera de Saphir</Link></figcaption>
            </figure>
          )}
          <p role="status" className="mb-4 text-sm text-stone">{total} {w.articles[total === 1 ? 0 : 1]}</p>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {pages.map((p) => (
              <li key={p.slug}>
                <Link href={`/${locale}/wikisphere/${p.slug}`} className="tilt-card block h-full overflow-hidden border border-gold/20 bg-coal">
                  {p.image && (p.category === "personajes" || p.category === "lugares") && <Image src={p.image} alt="" width={480} height={320} loading="lazy" className="h-40 w-full object-cover object-top" />}
                  <div className="p-4">
                    <p className="font-display text-xs uppercase tracking-widest text-gold">{w.cat[p.category] ?? p.categoryName}</p>
                    <h2 lang="es" className="mt-1 font-display text-lg">{p.title}</h2>
                    {p.description && <p lang="es" className="mt-1 line-clamp-2 text-sm text-stone">{p.description}</p>}
                  </div>
                </Link>
              </li>
            ))}
            {extra.map((a) => (
              <li key={a.id}>
                <Link href={`/${locale}/wikisphere/${a.slug}`} className="tilt-card block h-full border border-gold/20 bg-coal p-4">
                  <p className="font-display text-xs uppercase tracking-widest text-gold">{a.article_categories?.name[locale] ?? a.article_categories?.name.es}</p>
                  <h2 className="mt-1 font-display text-lg">{a.title}</h2>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
