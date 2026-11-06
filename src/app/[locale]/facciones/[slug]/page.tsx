import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { dict, isLocale, locales } from "@/lib/i18n";
import { factions, getFaction } from "@/content/factions";
import landings from "@/content/faction-landings.json";
import { landingHook } from "@/lib/landing-hook";
import { links } from "@/content/site";
import { elementFor } from "@/lib/element";
import { characterArt, factionCharacters, factionSubpages, factionWikiPage } from "@/lib/wiki";
import { groupBySubfaction } from "@/lib/minigroups";
import { pageMeta } from "@/lib/seo";
import { MiniCard } from "@/components/MiniCard";
import { HeroVideo } from "@/components/HeroVideo";
import { ElementCanvas } from "@/components/ElementCanvas";
import { ElementShader } from "@/components/faction/ElementShader";
import { HeroRail } from "@/components/faction/HeroRail";
import { ScrollWords } from "@/components/faction/ScrollWords";
import { StoryScroll } from "@/components/faction/StoryScroll";
import { Button, Pending, Section } from "@/components/ui";

type Landing = {
  god: { name: string; line: string }; hook: string; intro: string;
  chapters: { title: string; text: string; image: string; source: string }[];
  quote: { text: string; source: string };
  pillars: { name: string; text: string }[];
  heroes: { wikiSlug: string; name: string; reason: string }[];
  subfactions: { name: string; text: string }[];
};

export const generateStaticParams = () => locales.flatMap((locale) => factions.map((f) => ({ locale, slug: f.slug })));

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const f = getFaction(slug);
  const l = isLocale(locale) ? locale : "es";
  return f ? pageMeta({ title: `${f.name} · ${dict[l].pageMeta.factionLanding}`, description: `${f.blurb[l]} ${f.style[l]}`, path: `/facciones/${f.slug}`, image: f.image }, locale) : {};
}

export default async function FactionPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const f = getFaction(slug);
  if (!isLocale(locale) || !f) notFound();
  const t = dict[locale];
  const ft = t.factions;
  const land = (landings as Record<string, Landing>)[f.slug];
  const element = elementFor(f.theme)!;
  const { hook, hookLang } = landingHook(f.slug, locale);

  const wiki = factionWikiPage(f.slug);
  const characters = factionCharacters(f.slug);
  const topics = factionSubpages(f.slug).filter((p) => p.slug.split("/").length === 3);
  const miniGroups = groupBySubfaction(f, characters, ft.leadersTitle);
  const next = factions[(factions.findIndex((x) => x.slug === f.slug) + 1) % factions.length];
  const heroes = land.heroes.flatMap((h) => {
    const art = characterArt(h.wikiSlug);
    return art ? [{ name: h.name, reason: h.reason, img: art.src, light: art.bg === "light", href: `/${locale}/wikisphere/${h.wikiSlug}` }] : [];
  });

  return (
    <div data-faction={f.theme}>
      <div className="relative isolate flex min-h-[calc(100svh-4rem)] items-end overflow-hidden">
        <Image src={`/facciones/${f.slug}.webp`} alt="" fill priority sizes="100vw" className="land-hero-bg -z-30 object-cover" />
        <HeroVideo src={`/facciones/${f.slug}.mp4`} anyScreen position="center" pauseLabel={t.a11y.pauseVideo} playLabel={t.a11y.playVideo} />
        <ElementShader element={element} />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-abyss via-abyss/80 via-40% to-transparent to-80% md:via-abyss/55 md:via-30% md:to-70%" aria-hidden />
        <ElementCanvas element={element} />
        <div className="land-hero-out relative mx-auto w-full max-w-7xl px-4 pb-10 md:pb-14">
          <Image src={`/brand/factions/${f.slug}.webp`} alt="" width={120} height={120} className="land-rise sigil-glow h-20 w-auto object-contain md:h-28" />
          <h1 className="land-rise land-name mt-4 font-display text-ivory" style={{ "--d": 1 } as React.CSSProperties}>{f.name}</h1>
          <p lang={hookLang} className="land-rise mt-4 max-w-3xl font-display text-2xl text-accent md:text-3xl" style={{ "--d": 2 } as React.CSSProperties}>{hook}</p>
          <div className="land-rise mt-6 flex flex-wrap gap-3" style={{ "--d": 3 } as React.CSSProperties}>
            <Button href="#historia">{ft.landStory}</Button>
            <Button href={links.rules} variant="ghost" external>{t.hero.cta3}</Button>
          </div>
        </div>
      </div>

      <div className="land-tint">
        <section data-reveal className="mx-auto grid max-w-7xl gap-10 px-4 py-20 md:py-28 lg:grid-cols-[1.3fr_1fr]">
          <p lang="es" className="font-display text-3xl leading-snug md:text-5xl">{land.intro}</p>
          <div className="self-end border-t border-accent/50 pt-4">
            <p lang="es" className="font-display text-3xl text-accent">{land.god.name}</p>
            <p lang="es" className="mt-2 text-lg text-ivory/90">{land.god.line}</p>
          </div>
        </section>

        <section id="historia" className="scroll-mt-20 pb-12">
          <h2 className="mx-auto mb-6 max-w-7xl px-4 font-display text-5xl md:text-7xl">{ft.landStory}</h2>
          <StoryScroll chapters={land.chapters} note={ft.landLoreNote || undefined} />
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20">
          <h2 className="font-display text-4xl md:text-6xl">{ft.landPillars}</h2>
          <ol className="mt-10 grid gap-10 md:grid-cols-3">
            {land.pillars.map((p, i) => (
              <li key={p.name} data-reveal data-delay={i} className="border-t-2 border-accent pt-5">
                <h3 lang="es" className="font-display text-3xl text-accent">{p.name}</h3>
                <p lang="es" className="mt-3 text-lg text-ivory/90">{p.text}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <HeroRail heroes={heroes} title={ft.landHeroes} lead={ft.landHeroesLead} />

      <section className="relative isolate overflow-hidden bg-[var(--land-tint)] px-4 py-28 md:py-40">
        <ElementCanvas element={element} density={1.3} />
        <div className="relative mx-auto max-w-5xl text-center"><ScrollWords text={`«${land.quote.text}»`} /></div>
      </section>

      {land.subfactions.length > 0 && (
        <Section title={ft.subfactions}>
          <ul className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {land.subfactions.map((s, i) => (
              <li key={s.name} data-reveal data-delay={i % 3}>
                <h3 lang="es" className="font-display text-2xl text-accent">{s.name}</h3>
                <p lang="es" className="mt-2 text-ivory/90">{s.text}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {topics.length > 0 && (
        <Section title={ft.peopleTitle}>
          {locale !== "es" && <p className="mb-4 text-sm text-stone">{t.common.spanishOnly}</p>}
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((p) => (
              <li key={p.slug}>
                <Link href={`/${locale}/wikisphere/${p.slug}`} className="tilt-card block h-full border border-accent/30 bg-coal p-5">
                  <h3 lang="es" className="font-display text-xl">{p.title}</h3>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {wiki && <div className="mx-auto max-w-7xl px-4 pb-8"><Button href={`/${locale}/wikisphere/facciones/${f.slug}`} variant="ghost">{ft.readFull}</Button></div>}

      <Section id="miniaturas" title={ft.landAllMinis} lead={characters.length ? `${characters.length} ${ft.minisCount}` : undefined}>
        {characters.length === 0 ? (
          <Pending label={t.common.pendingLabel}>{t.common.pending}</Pending>
        ) : (
          <div className="space-y-12">
            {locale !== "es" && <p className="text-sm text-stone">{ft.excerptNote}</p>}
            {miniGroups.map((g) => (
              <div key={g.name ?? "all"}>
                {g.name && <h3 className="mb-5 font-display text-2xl text-accent">{g.name} <span className="text-sm text-stone">({g.pages.length})</span></h3>}
                <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
                  {g.pages.map((c) => <li key={c.slug}><MiniCard page={c} locale={locale} theme={f.theme} /></li>)}
                </ul>
              </div>
            ))}
          </div>
        )}
        <div className="mt-10 flex flex-wrap gap-3 border-t border-gold/25 pt-6">
          <Button href={`/${locale}/tienda/${f.slug}`}>{t.home.factionShop}</Button>
          <Button href={links.builder} variant="ghost" external>{t.home.builderCta}</Button>
        </div>
      </Section>

      <Link href={`/${locale}/facciones/${next.slug}`} data-faction={next.theme} data-element-host className="group relative isolate block overflow-hidden px-4 py-24 text-center md:py-36">
        <Image src={`/facciones/${next.slug}.webp`} alt="" fill sizes="100vw" loading="lazy" className="-z-20 object-cover opacity-55 transition-[opacity,transform] duration-700 ease-out group-hover:scale-105 group-hover:opacity-80" />
        <span className="absolute inset-0 -z-10 bg-abyss/40" aria-hidden />
        <ElementCanvas element={elementFor(next.theme)!} mode="hover" density={1.5} />
        <span className="relative block font-display text-lg text-ivory">{ft.landNext}</span>
        <span className="relative mt-2 block font-display text-5xl text-accent md:text-8xl">{next.name}</span>
      </Link>
    </div>
  );
}
