import { notFound } from "next/navigation";
import { dict, isLocale } from "@/lib/i18n";
import { Button, PageHero, Pending, Section } from "@/components/ui";

export type Block = { title: string; lead?: string; pending?: string; cta?: { label: string; href: string; external?: boolean }[] };

/** Builds a simple page from the localized dictionary; `build` receives the dictionary for the page's locale. */
export async function SimplePage({ params, build }: { params: Promise<{ locale: string }>; build: (t: (typeof dict)["es"], locale: "es" | "en" | "ca") => { title: string; lead?: string; blocks: Block[] } }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dict[locale];
  const { title, lead, blocks } = build(t, locale);
  return (
    <>
      <PageHero title={title} lead={lead} />
      {blocks.map((b) => (
        <Section key={b.title} title={b.title} lead={b.lead}>
          {b.pending && <Pending label={t.common.pendingLabel}>{b.pending}</Pending>}
          {b.cta && (
            <div className="mt-4 flex flex-wrap gap-4">
              {b.cta.map((c, i) => (
                <Button key={c.label} href={c.external ? c.href : `/${locale}${c.href}`} external={c.external} variant={i ? "ghost" : "solid"}>{c.label}</Button>
              ))}
            </div>
          )}
        </Section>
      ))}
    </>
  );
}
