import Link from "next/link";
import { staticMeta } from "@/lib/seo";
import { notFound } from "next/navigation";
import { dict, isLocale } from "@/lib/i18n";
import { searchAll, type SearchHit } from "@/lib/data";
import { chipCls, PageHero } from "@/components/ui";

export const generateMetadata = staticMeta({ title: (t) => t.search.title, path: "/buscar", noindex: true });

export default async function Page({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string; tipo?: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dict[locale].search;
  const { q = "", tipo } = await searchParams;
  const hits = await searchAll(locale, q);
  const groups = t.groups as Record<SearchHit["type"], string>;
  const shown = tipo && tipo in groups ? hits.filter((h) => h.type === tipo) : hits;
  const chip = chipCls;
  const url = (ty?: string) => `/${locale}/buscar?q=${encodeURIComponent(q)}${ty ? `&tipo=${ty}` : ""}`;

  return (
    <>
      <PageHero title={t.title} />
      <div className="mx-auto max-w-3xl px-4 py-12">
        <form role="search" action={`/${locale}/buscar`} className="flex gap-2">
          <label htmlFor="q" className="sr-only">{t.label}</label>
          <input id="q" name="q" defaultValue={q} minLength={2} required className="flex-1 border border-gold/40 bg-coal px-3 py-3" placeholder={t.placeholder} />
          <button className="bg-gold px-5 font-display text-sm font-semibold text-abyss">{t.button}</button>
        </form>

        {q.trim().length >= 2 && (
          <>
            <nav aria-label={t.filterAria} className="mt-6 flex flex-wrap gap-2">
              <Link href={url()} className={chip(!tipo)}>{t.all} ({hits.length})</Link>
              {(Object.keys(groups) as SearchHit["type"][]).map((ty) => (
                <Link key={ty} href={url(ty)} className={chip(tipo === ty)}>{groups[ty]} ({hits.filter((h) => h.type === ty).length})</Link>
              ))}
            </nav>
            <p role="status" className="mt-4 text-sm text-stone">{shown.length} {t.results[shown.length === 1 ? 0 : 1]}</p>
            <ul className="mt-2 divide-y divide-gold/10 border border-gold/20 bg-coal">
              {shown.map((h) => (
                <li key={h.type + h.href + h.title}>
                  <Link href={h.href} className="block p-4 hover:bg-gold/5">
                    <span className="font-display text-sm text-gold">{groups[h.type]}</span>
                    <span lang={h.type === "wiki" ? "es" : undefined} className="block">{h.title}</span>
                    {h.detail && <span className="text-xs text-stone">{h.detail}</span>}
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
