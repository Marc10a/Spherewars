import { notFound } from "next/navigation";
import { dict, isLocale } from "@/lib/i18n";
import { staticMeta } from "@/lib/seo";
import { links, stats } from "@/content/site";
import Image from "next/image";
import official from "@/content/official-files.json";
import { Lightbox } from "@/components/Lightbox";
import { Button, PageHero, Section } from "@/components/ui";

export const generateMetadata = staticMeta({ title: (t) => t.game.title, description: (t) => t.game.description, path: "/juego" });

const journeyLinks: { href: string; ext?: boolean }[] = [
  { href: links.rules, ext: true }, { href: "/facciones" }, { href: links.builder, ext: true },
  { href: "/miniaturas" }, { href: "/eventos" },
];

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dict[locale];
  const g = t.game;
  const facts: [string, string][] = [
    [g.figMinis, stats.minis], [g.figTime, `${stats.minutes} ${t.common.unit.minutes}`], [g.figTable, `${stats.table} cm`], [g.figEdition, g.edition3],
  ];

  return (
    <>
      <PageHero title={g.title} lead={g.lead}>
        <Button href={links.rules} external>{g.downloadRules}</Button>
      </PageHero>

      <Section title={g.figuresTitle}>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {facts.map(([k, v], i) => (
            <div key={k} data-reveal data-delay={i} className="border border-gold/20 bg-coal p-6 text-center">
              <dd className="font-display text-3xl text-gold">{v}</dd>
              <dt className="mt-2 text-xs uppercase tracking-widest text-stone">{k}</dt>
            </div>
          ))}
        </dl>
        <p className="mt-6 max-w-3xl text-stone">{g.figuresText}</p>
      </Section>

      <Section title={g.summaryTitle}>
        <Lightbox locale={locale}>
          <div className="grid gap-6 md:grid-cols-2">
            {official.game.map((im, i) => (
              <Image key={im.id} src={im.src} alt={i === 0 ? g.summaryAltA : g.summaryAltB} width={im.w} height={im.h} loading="lazy" sizes="(min-width:768px) 50vw, 100vw" className="h-auto w-full border border-gold/20" />
            ))}
          </div>
        </Lightbox>
      </Section>

      <Section title={g.journeyTitle}>
        <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {g.steps.map(([title, desc], i) => {
            const l = journeyLinks[i];
            return (
              <li key={title} data-reveal data-delay={i % 3}>
                <a href={l.ext ? l.href : `/${locale}${l.href}`} {...(l.ext ? { rel: "noopener" } : {})} className="tilt-card flex h-full gap-4 border border-gold/25 bg-coal p-5">
                  <span className="font-display text-4xl text-gold/80">{i + 1}</span>
                  <span><span className="block font-display text-lg">{title}</span><span className="text-sm text-stone">{desc}</span></span>
                </a>
              </li>
            );
          })}
        </ol>
      </Section>

      <Section title={g.howTitle} lead={g.howLead}>
        <ol className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {g.howSteps.map(([title, text], i) => (
            <li key={title}>
              <span aria-hidden className="block font-display text-5xl font-bold leading-none text-gold/70">{i + 1}</span>
              <h3 className="mt-3 font-display text-xl">{title}</h3>
              <p className="mt-2 text-ivory/90">{text}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8 flex flex-wrap gap-4">
          <Button href={links.rules} external>{g.downloadRules}</Button>
        </div>
      </Section>

      <Section title={g.faqTitle}>
        <div className="divide-y divide-gold/10 border border-gold/20 bg-coal">
          {g.faq.map(([q, a]) => (
            <details key={q} className="group p-5">
              <summary className="cursor-pointer font-display text-lg">{q}</summary>
              <p className="mt-2 text-ivory/80">{a}</p>
            </details>
          ))}
        </div>
      </Section>
    </>
  );
}
