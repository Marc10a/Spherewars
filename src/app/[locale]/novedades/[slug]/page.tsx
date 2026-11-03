import Link from "next/link";
import { notFound } from "next/navigation";
import { dict, isLocale } from "@/lib/i18n";
import { pageMeta } from "@/lib/seo";
import { getNews } from "@/lib/data";
import { PageHero } from "@/components/ui";
import { RichText } from "@/components/RichText";
import { cleanCmsHtml } from "@/lib/cms/sanitize";
import { cmsImageUrl } from "@/lib/cms/images";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const n = isLocale(locale) ? await getNews(locale, slug) : null;
  return pageMeta({ title: n?.seo?.title ?? n?.title, description: n?.seo?.description ?? n?.excerpt ?? undefined, path: `/novedades/${slug}`, image: n?.image?.url }, locale);
}

export default async function Page({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const t = dict[locale];
  const n = await getNews(locale, slug);
  if (!n) notFound();
  return (
    <>
      <PageHero title={n.title} lead={n.category} image={cmsImageUrl(n.image?.url)} />
      <article className="mx-auto max-w-3xl px-4 py-12">
        {n.publish_at && <p className="mb-6 text-xs uppercase tracking-widest text-stone">{t.news.published} {new Date(n.publish_at).toLocaleDateString(locale)}</p>}
        {n.body?.html ? <div className="wiki-prose" dangerouslySetInnerHTML={{ __html: cleanCmsHtml(n.body.html) }} /> : <RichText md={n.body?.md} />}
        <Link href={`/${locale}/novedades`} className="mt-10 inline-block text-xs uppercase tracking-widest text-gold hover:text-ivory">{t.news.back}</Link>
      </article>
    </>
  );
}
