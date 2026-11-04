import Image from "next/image";
import { oneParam } from "@/lib/params";
import { staticMeta } from "@/lib/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { dict, isLocale } from "@/lib/i18n";
import { listArticles } from "@/lib/data";
import { characterArt, searchWiki, wikiCategories, wikiPages } from "@/lib/wiki";
import { Button, chipCls, PageHero } from "@/components/ui";
import { LoreOverview } from "@/components/LoreOverview";

export const generateMetadata = staticMeta({ title: (t) => t.wiki.title, description: (t) => t.wiki.lead, path: "/wikisphere" });

export default async function Page({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ categoria?: string | string[]; q?: string | string[] }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dict[locale];
  const w = t.wiki;
  const sp = await searchParams;
  const categoria = oneParam(sp.categoria);
  const q = oneParam(sp.q);
  const pages = searchWiki(q, categoria);
  const extra = await listArticles(locale, { q }); // editorial articles from the CMS, if any
  const total = pages.length + extra.length;
  const chip = chipCls;

  return (
    <>
      <PageHero title={w.title} lead={w.lead} image="/wiki/images/esfera_saphir_golothar.webp" imagePosition="center 35%">
        {!q && !categoria && <Button href="#articulos" variant="ghost">{w.jumpToIndex}</Button>}
      </PageHero>
      {!q && !categoria && <LoreOverview locale={locale} />}
      <div id="articulos" className="mx-auto grid max-w-7xl gap-10 px-4 py-12 lg:grid-cols-[16rem_1fr]">
        <aside className="space-y-6">
          <form role="search" action={`/${locale}/wikisphere`}>
            <label htmlFor="q" className="font-display text-sm text-gold">{w.searchLabel}</label>
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
          <p role="status" className="mb-4 text-sm text-stone">{total} {w.articles[total === 1 ? 0 : 1]}</p>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {pages.map((p) => {
              const art = p.category === "personajes" ? characterArt(p.slug) : null;
              return (
              <li key={p.slug}>
                <Link href={`/${locale}/wikisphere/${p.slug}`} className="tilt-card block h-full overflow-hidden border border-gold/20 bg-coal">
                  {art ? (
                    <span className={`relative block h-44 ${art.bg === "light" ? "bg-ivory" : "spot"}`}>
                      <Image src={art.src} alt="" fill sizes="(min-width:1280px) 22vw, (min-width:640px) 40vw, 100vw" loading="lazy" className={`object-contain p-2 ${art.bg === "light" ? "mix-blend-multiply" : ""}`} />
                    </span>
                  ) : p.image && p.category === "lugares" ? (
                    <Image src={p.image} alt="" width={480} height={320} loading="lazy" className="h-auto w-full" />
                  ) : null}
                  <div className="p-4">
                    <p className="font-display text-sm text-gold">{w.cat[p.category] ?? p.categoryName}</p>
                    <h2 lang="es" className="mt-1 font-display text-lg">{p.title}</h2>
                    {p.description && <p lang="es" className="mt-1 line-clamp-2 text-sm text-stone">{p.description}</p>}
                  </div>
                </Link>
              </li>
              );
            })}
            {extra.map((a) => (
              <li key={a.id}>
                <Link href={`/${locale}/wikisphere/${a.slug}`} className="tilt-card block h-full border border-gold/20 bg-coal p-4">
                  <p className="font-display text-sm text-gold">{a.article_categories?.name[locale] ?? a.article_categories?.name.es}</p>
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
