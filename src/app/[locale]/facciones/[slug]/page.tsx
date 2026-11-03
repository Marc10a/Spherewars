import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { dict, isLocale, locales } from "@/lib/i18n";
import { factions, getFaction } from "@/content/factions";
import { links } from "@/content/site";
import { factionCharacters, factionSubpages, factionWikiPage } from "@/lib/wiki";
import { groupBySubfaction } from "@/lib/minigroups";
import { MiniCard } from "@/components/MiniCard";
import { Button, PageHero, Pending, Section } from "@/components/ui";
import { pageMeta } from "@/lib/seo";

export const generateStaticParams = () => locales.flatMap((locale) => factions.map((f) => ({ locale, slug: f.slug })));

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const f = getFaction(slug);
  const l = isLocale(locale) ? locale : "es";
  return f ? pageMeta({ title: f.name, description: `${f.blurb[l]} ${f.style[l]}`, path: `/facciones/${f.slug}`, image: f.image }, locale) : {};
}

export default async function FactionPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const f = getFaction(slug);
  if (!isLocale(locale) || !f) notFound();
  const t = dict[locale];
  const ft = t.factions;

  const wiki = factionWikiPage(f.slug);
  const characters = factionCharacters(f.slug);
  const topics = factionSubpages(f.slug).filter((p) => p.slug.split("/").length === 3);
  const wikiHref = `/${locale}/wikisphere/facciones/${f.slug}`;

  const miniGroups = groupBySubfaction(f, characters, ft.leadersTitle);

  return (
    <div data-faction={f.theme}>
      <PageHero title={f.name} lead={f.blurb[locale]} theme={f.theme} image={f.image} />

      <Section title={ft.playstyle} lead={f.style[locale]}>
        <div className="grid items-center gap-8 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="text-sm text-stone">{ft.tones}: {f.palette[locale].join(" · ")}</p>
            {wiki && <div className="mt-6"><Button href={wikiHref}>{ft.readFull}</Button></div>}
          </div>
          <Image src={`/brand/factions/${f.slug}.webp`} alt={f.name} width={420} height={420} loading="lazy" className="h-40 w-auto justify-self-start sm:justify-self-end" />
        </div>
      </Section>

      {f.subfactions && (
        <Section title={ft.subfactions}>
          <div className="grid gap-6 md:grid-cols-2">
            {f.subfactions.map((s) => (
              <div key={s.name} className="flex items-center gap-5 border border-accent/40 bg-coal p-6">
                {s.name.startsWith("Mercenarias") && <Image src="/brand/factions/mercenarias-de-isha.webp" alt={s.name} width={320} height={420} loading="lazy" className="h-24 w-auto shrink-0" />}
                <div>
                  <h3 className="font-display text-xl text-accent">{s.name}</h3>
                  <p className="mt-2 text-stone">{s.note[locale]}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {topics.length > 0 && (
        <Section title={ft.peopleTitle}>
          {locale !== "es" && <p className="mb-4 text-xs text-stone">{t.common.spanishOnly}</p>}
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((p) => (
              <li key={p.slug}>
                <Link href={`/${locale}/wikisphere/${p.slug}`} className="tilt-card block h-full overflow-hidden border border-accent/30 bg-coal">
                  <h3 lang="es" className="p-5 font-display text-lg">{p.title}</h3>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section id="miniaturas" title={ft.minisTitle} lead={characters.length ? `${characters.length} ${ft.minisCount}` : undefined}>
        {characters.length === 0 ? (
          <Pending label={t.common.pendingLabel}>{t.common.pending}</Pending>
        ) : (
          <div className="space-y-12">
            {locale !== "es" && <p className="text-xs text-stone">{ft.excerptNote}</p>}
            {miniGroups.map((g) => (
              <div key={g.name ?? "all"}>
                {g.name && <h3 className="mb-5 font-display text-2xl text-accent">{g.name} <span className="text-sm text-stone">({g.pages.length})</span></h3>}
                <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {g.pages.map((c) => <li key={c.slug}><MiniCard page={c} locale={locale} theme={f.theme} /></li>)}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title={t.common.nextStep}>
        <div className="flex flex-wrap gap-4">
          <Button href={links.builder} external>{t.home.builderCta}</Button>
          <Button href={`/${locale}/miniaturas?faccion=${f.slug}`} variant="ghost">{ft.minis}</Button>
          <Button href={links.wiki} variant="ghost" external>{t.common.wikiOfficial}</Button>
        </div>
      </Section>
    </div>
  );
}
