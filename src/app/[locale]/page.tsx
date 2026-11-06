import Image from "next/image";
import { notFound } from "next/navigation";
import { dict, isLocale } from "@/lib/i18n";
import { factions } from "@/content/factions";
import { links, stats } from "@/content/site";
import { BrandText, Button } from "@/components/ui";
import { Wordmark } from "@/components/Wordmark";
import { EssenceOrb } from "@/components/fx/EssenceOrb";
import { FactionPan } from "@/components/fx/FactionPan";
import { LoopVideo } from "@/components/fx/LoopVideo";
import { ScrollWords } from "@/components/faction/ScrollWords";
import { landingHook } from "@/lib/landing-hook";
import { HeroVideo } from "@/components/HeroVideo";
import { EssenceThreads } from "@/components/EssenceThreads";
import { ElementCanvas } from "@/components/ElementCanvas";
import { elementFor } from "@/lib/element";
import { alternates, defaultOg } from "@/lib/seo";

export const generateMetadata = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params;
  return {
    alternates: alternates(locale, ""),
    openGraph: { title: "SphereWars: Otro Mundo", images: [{ url: defaultOg }] },
  };
};

// The home only explains what SphereWars is and its world. Everything else lives in its own section.
export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dict[locale];
  const { hero, home: h } = t;

  return (
    <>
      <div className="relative isolate flex flex-col justify-end overflow-hidden md:min-h-[calc(100svh-4rem)]">
        <div className="relative -z-30 aspect-video w-full md:absolute md:inset-0 md:aspect-auto">
          <Image src="/brand/hero-intro.webp" alt="Los dioses de SphereWars sobre el mundo de Saphir." fill priority sizes="100vw" className="object-cover object-center" />
        </div>
        <HeroVideo src="/brand/sphere-hero.mp4" mobileSrc="/brand/sphere-hero-m.mp4" position="center" pauseLabel={t.a11y.pauseVideo} playLabel={t.a11y.playVideo} />
        <div className="absolute inset-0 -z-10 hidden bg-gradient-to-t from-abyss via-abyss/50 via-30% to-transparent to-65% md:block" aria-hidden />
        <div className="land-hero-out mx-auto w-full max-w-7xl px-4 pb-10 pt-6 md:pb-14 md:pt-0">
          <p className="land-rise flex leading-none text-gold" style={{ fontSize: "clamp(4rem, 13vw, 12rem)" }}><Wordmark className="ember-text" /></p>
          <h1 className="land-rise mt-3 font-display text-3xl leading-tight md:text-5xl" style={{ "--d": 1 } as React.CSSProperties}><BrandText text={hero.title} /></h1>
          <p className="land-rise mt-2 max-w-2xl text-lg text-ivory/90 md:text-xl" style={{ "--d": 2 } as React.CSSProperties}>{hero.subtitle}. {hero.text}</p>
          <div className="land-rise mt-6 flex flex-wrap gap-3" style={{ "--d": 3 } as React.CSSProperties}>
            <Button href={links.rules} external>{hero.cta3}</Button>
            <Button href={`/${locale}/juego`} variant="ghost">{hero.cta1}</Button>
          </div>
        </div>
      </div>

      <section id="que-es" className="relative isolate bg-abyss">
        <div className="sticky top-0 -z-10 h-svh"><EssenceOrb /></div>
        <div className="orb-text -mt-[100svh] px-4 pb-[28svh] pt-[42svh]">
          <div className="mx-auto max-w-5xl text-center">
            <h2 className="font-display text-5xl md:text-8xl"><BrandText text={h.whatTitle} /></h2>
            <div className="mt-[34svh]"><ScrollWords text={h.whatText} lang={locale} /></div>
            <dl className="mt-[34svh] grid grid-cols-3 gap-4 bg-abyss/70 px-3 py-6">
              {[[stats.minis, h.statMinis], [stats.minutes, h.statTime], [stats.table, h.statTable]].map(([n, l]) => (
                <div key={l} data-reveal>
                  <dt className="font-display text-3xl text-gold md:text-7xl">{n}</dt>
                  <dd className="mt-1 text-sm md:text-lg">{l}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <EssenceThreads title={h.essenceTitle} hint={h.essenceHint} lead={h.essenceLead} />

      <FactionPan title={h.factionsTitle} cta={h.factionEnter} factions={factions.map((f) => ({ slug: f.slug, name: f.name, theme: f.theme, ...landingHook(f.slug, locale), href: `/${locale}/facciones/${f.slug}`, element: elementFor(f.theme)! }))} />

      <div className="relative isolate flex min-h-svh flex-col items-center justify-center overflow-hidden px-4 text-center">
        <Image src="/brand/sphere-outro.webp" alt="" fill sizes="100vw" loading="lazy" className="-z-30 object-cover" />
        <LoopVideo src="/brand/sphere-outro.mp4" className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-abyss/55" aria-hidden />
        <ElementCanvas element="fire" density={1.4} />
        <h2 className="land-name relative font-display">{h.finalTitle}</h2>
        <div className="relative mt-8 flex flex-wrap justify-center gap-3">
          <Button href={`/${locale}/juego`}>{h.finalCta}</Button>
          <Button href={`/${locale}/wikisphere`} variant="ghost">{h.worldCta}</Button>
        </div>
      </div>
    </>
  );
}
