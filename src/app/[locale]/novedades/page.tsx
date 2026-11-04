import Link from "next/link";
import { notFound } from "next/navigation";
import { dict, isLocale } from "@/lib/i18n";
import { staticMeta } from "@/lib/seo";
import { listNews } from "@/lib/data";
import { PageHero, Pending } from "@/components/ui";

export const generateMetadata = staticMeta({ title: (t) => t.news.title, description: (t) => t.news.lead, path: "/novedades" });

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dict[locale];
  const items = await listNews(locale, 50);

  return (
    <>
      <PageHero title={t.news.title} lead={t.news.lead} image="/wiki/images/legi_n_portada_concept.webp" imagePosition="center 20%" />
      <div className="mx-auto max-w-4xl px-4 py-12" data-wp-slot="news-list">
        {items.length === 0 ? (
          <Pending label={t.common.pendingLabel}>{t.news.empty}</Pending>
        ) : (
          <ul className="divide-y divide-gold/10 border border-gold/20 bg-coal">
            {items.map((n) => (
              <li key={n.id}>
                <Link href={`/${locale}/novedades/${n.slug}`} className="block p-5 hover:bg-gold/5">
                  <p className="font-display text-sm text-gold">{n.category}{n.publish_at ? ` · ${new Date(n.publish_at).toLocaleDateString(locale)}` : ""}</p>
                  <h2 className="mt-1 font-display text-xl">{n.title}</h2>
                  {(n.excerpt || n.body?.md) && <p className="mt-2 line-clamp-2 text-sm text-stone">{(n.excerpt || n.body?.md || "").replace(/[#>*_-]/g, "").slice(0, 220)}</p>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
