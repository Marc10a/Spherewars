import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { dict, isLocale, locales } from "@/lib/i18n";
import { getArticle } from "@/lib/data";
import { getWikiPage, loreImage, prepareArticle, relatedPages, siblings, wikiCategories, wikiPages, wikiSource } from "@/lib/wiki";
import { jsonLd, pageMeta, siteUrl } from "@/lib/seo";
import { PageHero } from "@/components/ui";
import { RichText } from "@/components/RichText";
import { Lightbox } from "@/components/Lightbox";

type P = { locale: string; slug: string[] };

export const generateStaticParams = () => locales.flatMap((locale) => wikiPages.map((p) => ({ locale, slug: p.slug.split("/") })));

export async function generateMetadata({ params }: { params: Promise<P> }) {
  const { locale, slug } = await params;
  const w = getWikiPage(slug.join("/"));
  if (!w) return {};
  const img = loreImage(w) ?? w.image ?? undefined;
  const original = locale === "es";
  return pageMeta({ title: w.title, description: w.description || `${w.title} · ${w.categoryName}`, path: `/wikisphere/${w.slug}`, image: img, canonicalLocale: original ? undefined : "es", noindex: !original }, locale);
}

export default async function Page({ params }: { params: Promise<P> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const joined = slug.map(decodeURIComponent).join("/");

  const w = getWikiPage(joined);
  if (w) {
    const t = dict[locale];
    const { html, toc } = prepareArticle(w, locale);
    const related = relatedPages(w);
    const { prev, next } = siblings(w);
    const cat = wikiCategories.find((c) => c.slug === w.category);
    return (
      <>
        <PageHero title={w.title} lead={cat ? t.wiki.cat[cat.slug] ?? cat.name : undefined} />
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[15rem_1fr]">
          <aside className="lg:sticky lg:top-24 lg:h-fit">
            {toc.length > 1 && (
              <nav aria-label={t.wiki.tocAria} className="mb-8 border border-gold/20 bg-coal p-4 text-sm">
                <p className="mb-2 font-display text-sm text-gold">{t.wiki.toc}</p>
                <ul className="max-h-[50vh] space-y-1 overflow-y-auto">
                  {toc.map((h) => (
                    <li key={h.id} className={h.level === 3 ? "pl-4" : ""}>
                      <a lang="es" href={`#${h.id}`} className="text-ivory/80 hover:text-gold">{h.text}</a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
          </aside>

          <div className="min-w-0">
            <nav aria-label={t.wiki.crumbs} className="mb-8 font-display text-sm text-stone">
              <Link href={`/${locale}/wikisphere`} className="inline-block py-2 hover:text-gold">WikiSphere</Link> /{" "}
              <Link href={`/${locale}/wikisphere?categoria=${w.category}`} className="inline-block py-2 hover:text-gold">{t.wiki.cat[w.category] ?? w.categoryName}</Link>
            </nav>
            {locale !== "es" && <p role="note" className="mb-6 border border-gold/30 bg-coal p-3 text-sm text-stone">{t.common.spanishOnly}</p>}
            <Lightbox locale={locale}><article lang="es" className="wiki-prose" dangerouslySetInnerHTML={{ __html: html }} /></Lightbox>

            <p className="mt-10 text-xs text-stone">
              {t.wiki.official}: <a className="underline" rel="noopener" href={`${wikiSource}/es/${w.path}`}>{t.wiki.officialWiki}</a> · {t.common.updated} {new Date(w.updatedAt).toLocaleDateString(locale)}
            </p>

            {(prev || next) && (
              <nav aria-label={t.wiki.adjacent} className="mt-10 grid gap-4 sm:grid-cols-2">
                {prev ? <Link href={`/${locale}/wikisphere/${prev.slug}`} className="border border-gold/20 bg-coal p-4 hover:border-gold"><span className="font-display text-sm text-gold">{t.wiki.prev}</span><span lang="es" className="block font-display">{prev.title}</span></Link> : <span />}
                {next && <Link href={`/${locale}/wikisphere/${next.slug}`} className="border border-gold/20 bg-coal p-4 text-right hover:border-gold"><span className="font-display text-sm text-gold">{t.wiki.next}</span><span lang="es" className="block font-display">{next.title}</span></Link>}
              </nav>
            )}
          </div>
        </div>

        {related.length > 0 && (
          <section aria-label={t.wiki.related} className="mx-auto max-w-6xl px-4 pb-16">
            <h2 className="font-display text-2xl">{t.wiki.related}</h2>
            <hr className="rune-divider my-6" />
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => {
                const img = r.category === "personajes" || r.category === "lugares" ? loreImage(r) : null;
                return (
                  <li key={r.slug}>
                    <Link href={`/${locale}/wikisphere/${r.slug}`} className="tilt-card flex h-full items-center gap-4 border border-gold/20 bg-coal p-3">
                      {img && <Image src={img} alt="" width={64} height={64} loading="lazy" className="h-16 w-16 shrink-0 object-contain" />}
                      <span><span className="block font-display text-sm text-gold">{t.wiki.cat[r.category] ?? r.categoryName}</span><span lang="es" className="font-display">{r.title}</span></span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd({
            "@context": "https://schema.org", "@type": "Article", headline: w.title, inLanguage: "es", dateModified: w.updatedAt,
            description: w.description || undefined, image: (loreImage(w) ?? w.image) ? `${siteUrl}${loreImage(w) ?? w.image}` : undefined,
            mainEntityOfPage: `${siteUrl}/${locale}/wikisphere/${w.slug}`, publisher: { "@type": "Organization", name: "SphereWars" },
          }) }}
        />
      </>
    );
  }

  // Editorial articles from the database (single-segment slugs).
  const a = slug.length === 1 ? await getArticle(locale, joined) : null;
  if (!a) notFound();
  return (
    <>
      <PageHero title={a.title} lead={a.article_categories?.name[locale] ?? a.article_categories?.name.es} />
      <article className="mx-auto max-w-3xl px-4 py-12">
        <RichText md={a.body?.md} />
        <p className="mt-10 text-xs text-stone">Actualizado {new Date(a.updated_at).toLocaleDateString(locale)}</p>
      </article>
    </>
  );
}
