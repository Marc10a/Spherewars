import Link from "next/link";
import { notFound } from "next/navigation";
import { pageMeta } from "@/lib/seo";
import { PageHero } from "@/components/ui";
import { LegalText } from "@/components/LegalText";
import { dict, fmt, isLocale, locales } from "@/lib/i18n";
import { LEGAL_DOCS, LEGAL_DRAFT_DATE, isLegalDoc, legalTexts } from "@/lib/legal";

export const generateStaticParams = () => locales.flatMap((locale) => LEGAL_DOCS.map((doc) => ({ locale, doc })));

export async function generateMetadata({ params }: { params: Promise<{ locale: string; doc: string }> }) {
  const { locale, doc } = await params;
  // noindex while the texts are a draft pending legal review.
  return pageMeta({ title: isLocale(locale) ? dict[locale].legal.titles[doc] : undefined, description: isLocale(locale) ? dict[locale].pageMeta.legal[doc] : undefined, path: `/legal/${doc}`, noindex: true }, locale);
}

export default async function Page({ params }: { params: Promise<{ locale: string; doc: string }> }) {
  const { locale, doc } = await params;
  if (!isLocale(locale) || !isLegalDoc(doc)) notFound();
  const t = dict[locale].legal;
  const date = new Date(`${LEGAL_DRAFT_DATE}T12:00:00Z`).toLocaleDateString(locale === "ca" ? "ca-ES" : locale === "en" ? "en-GB" : "es-ES", { day: "numeric", month: "long", year: "numeric" });
  return (
    <>
      <PageHero title={t.titles[doc]} />
      <article className="mx-auto max-w-3xl px-4 py-12">
        <div role="note" aria-labelledby="legal-draft" className="mb-10 border border-gold/60 bg-coal p-5">
          <p id="legal-draft" className="font-display text-xl text-gold">
            <span lang="es">{dict.es.legal.draftTitle}</span>
            {locale !== "es" && <span className="mt-1 block text-lg text-ivory">{t.draftTitle}</span>}
          </p>
          <p className="mt-2 text-ivory/90">{fmt(t.draftBody, { date })}</p>
          {t.translation && (
            <p className="mt-2 text-ivory/90">
              {t.translation} <Link href={`/es/legal/${doc}`} hrefLang="es" className="text-gold underline underline-offset-2 hover:text-ivory">{t.translationLink}</Link>
            </p>
          )}
        </div>
        <LegalText text={legalTexts[locale][doc]} locale={locale} pendingLabel={t.placeholder} />
        <nav aria-label={t.otherDocs} className="mt-14 border-t border-gold/30 pt-6">
          <h2 className="font-display text-lg text-ivory">{t.otherDocs}</h2>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
            {LEGAL_DOCS.filter((d) => d !== doc).map((d) => (
              <li key={d}><Link href={`/${locale}/legal/${d}`} className="inline-block py-1.5 text-gold hover:text-ivory">{t.titles[d]}</Link></li>
            ))}
          </ul>
        </nav>
      </article>
    </>
  );
}
