import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { dict, isLocale } from "@/lib/i18n";
import { factions } from "@/content/factions";
import { links, stats } from "@/content/site";
import { BrandText, Button, Pending, Section } from "@/components/ui";
import { FactionCard } from "@/components/FactionCard";
import { Carousel } from "@/components/Carousel";
import { ContactSection } from "@/components/ContactSection";
import { Particles } from "@/components/Particles";
import { getWikiPage } from "@/lib/wiki";
import { listEvents, listNews, eventKinds } from "@/lib/data";
import { alternates, defaultOg } from "@/lib/seo";

export const generateMetadata = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params;
  return {
    alternates: alternates(locale, ""),
    openGraph: { title: "SphereWars: Otro Mundo", images: [{ url: defaultOg }] },
  };
};

// Static page, refreshed every 5 minutes (news/events come from public reads).
export const revalidate = 300;


// Official text of the Three Divine Laws (wiki "Bienvenido a la Wiki de SphereWars").
const laws = [
  { n: "I", name: "Don de la Creación", text: "Reserva únicamente a los cuatro dioses primordiales el derecho de crear las esferas y a sus habitantes. Les prohíbe además alzarse en armas unos contra otros: serán sus creaciones quienes combatan en su lugar." },
  { n: "II", name: "Mandato de la Vida", text: "Otorga a Salssa'el la responsabilidad de insuflar vida a toda creación divina, sin excepción." },
  { n: "III", name: "Tributo a la Muerte", text: "Concede a Ínferis el derecho y el deber de reclamar toda alma cuando llegue el final de su existencia." },
];

const gods = [
  { slug: "dioses/dios-kazag", name: "Kazag", epithet: "godKazag", img: "/wiki/images/dios_kazag.webp", theme: "urueh" },
  { slug: "dioses/dios-kurgan", name: "Kurgan", epithet: "godKurgan", img: "/wiki/images/dios_kurgan.webp", theme: "kurgan" },
  { slug: "dioses/dios-malesur", name: "Malesur", epithet: "godMalesur", img: "/wiki/images/dios_malesur.webp", theme: "malesur" },
] as const;

const legends = [
  { name: "Toro", faction: "adeptos-de-malesur", slug: "toro", img: "/tienda/adeptos-de-malesur/toro-clean.webp" },
  { name: "Raggarth, el Liberador", faction: "vastagos-de-kurgan", slug: "raggarth", img: "/tienda/vastagos-de-kurgan/raggarth-clean.webp" },
  { name: "Fundidor", faction: "manadas-de-urueh", slug: "fundidor", img: "/tienda/mandas-de-urueh/fundidor-clean.webp" },
  { name: "Róxter, el Piloto", faction: "alianza", slug: "roxter", img: "/tienda/alianza/roxter-clean.webp" },
];

const ages = [
  { slug: "historia/saphir", name: "Saphir", img: "/wiki/images/cronolog_a_de_saphir_horizontal.webp" },
  { slug: "historia/hijos-de-kazag", name: "Hijos de Kazag", img: "/wiki/images/cronolog_a_kazag_horizontal.webp" },
  { slug: "historia/hijos-de-kurgan", name: "Hijos de Kurgan", img: "/wiki/images/cronolog_a_de_kurgan_horizontal.webp" },
  { slug: "historia/hijos-de-malesur", name: "Hijos de Malesur", img: "/wiki/images/cronolog_a_de_malesur_horitzontal.webp" },
];

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dict[locale];
  const { hero, home: h, common } = t;
  const carousel = { prev: h.prev, next: h.next, slide: h.slideOf };
  const [news, events] = await Promise.all([listNews(locale, 3), listEvents()]);
  const nextEvents = events.slice(0, 3);

  return (
    <>
      <div className="relative isolate flex flex-col justify-end overflow-hidden md:min-h-[calc(100svh-4rem)]">
        <div className="relative -z-20 aspect-[2000/1518] w-full md:absolute md:inset-0 md:aspect-auto">
          <Image src="/brand/hero-quinta.webp" alt="SphereWars: Otro Mundo. Guerreros de las facciones enfrentados bajo la Esfera en llamas." fill priority sizes="100vw" className="object-cover object-[center_22%]" />
        </div>
        <div className="absolute inset-0 -z-10 hidden bg-gradient-to-t from-abyss via-abyss/80 via-30% to-transparent to-60% md:block" aria-hidden />
        <div className="mx-auto w-full max-w-5xl px-4 pb-8 pt-5 text-center md:pt-0">
          <h1 className="fade-up font-display text-3xl font-bold leading-tight md:text-5xl"><BrandText text={hero.title} /></h1>
          <p className="fade-up mt-2 font-display text-lg font-semibold text-gold md:text-2xl" style={{ animationDelay: ".15s" }}>{hero.subtitle}</p>
          <p className="fade-up mx-auto mt-3 max-w-xl text-lg" style={{ animationDelay: ".3s" }}>{hero.text}</p>
          <div className="fade-up mt-6 flex flex-wrap justify-center gap-3" style={{ animationDelay: ".45s" }}>
            <Button href={links.rules} external>{hero.cta3}</Button>
            <Button href={`/${locale}/juego`} variant="ghost">{hero.cta1}</Button>
          </div>
          <ul className="fade-up mt-7 flex flex-wrap items-center justify-center gap-6 md:gap-12" style={{ animationDelay: ".6s" }}>
            {factions.map((f) => (
              <li key={f.slug}>
                <Link href={`/${locale}/facciones/${f.slug}`} className="block transition-transform duration-200 hover:-translate-y-1" aria-label={f.name} title={f.name}>
                  <Image src={`/brand/factions/${f.slug}.webp`} alt="" width={72} height={72} className="h-12 w-auto object-contain md:h-16" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <section className="border-y border-gold/25 bg-coal">
        <dl className="mx-auto grid max-w-7xl grid-cols-3 gap-4 px-4 py-7 text-center">
          {[[stats.minis, h.statMinis], [stats.minutes, h.statTime], [stats.table, h.statTable]].map(([n, l]) => (
            <div key={l}>
              <dt className="font-display text-2xl font-bold text-gold md:text-4xl">{n}</dt>
              <dd className="mt-1 text-sm md:text-base">{l}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div id="que-es">
        <Section title={h.whatTitle} lead={h.whatText} compact>
          <h3 className="font-display text-3xl text-gold">{h.startTitle}</h3>
          <p className="mt-2 text-stone">{h.startLead}</p>
          <ol className="mt-8 grid gap-10 md:grid-cols-3">
            <li>
              <span aria-hidden className="block font-display text-6xl font-bold leading-none text-gold/70">1</span>
              <h4 className="mt-3 font-display text-2xl">{h.step1Title}</h4>
              <p className="mt-2 text-ivory/90">{h.step1Text}</p>
              <div className="mt-5"><Button href={links.rules} external>{hero.cta3}</Button></div>
            </li>
            <li>
              <span aria-hidden className="block font-display text-6xl font-bold leading-none text-gold/70">2</span>
              <h4 className="mt-3 font-display text-2xl">{h.step2Title}</h4>
              <p className="mt-2 text-ivory/90">{h.step2Text}</p>
              <div className="mt-5"><Button href={`/${locale}/tienda`} variant="ghost">{h.step2Cta}</Button></div>
            </li>
            <li>
              <span aria-hidden className="block font-display text-6xl font-bold leading-none text-gold/70">3</span>
              <h4 className="mt-3 font-display text-2xl">{h.step3Title}</h4>
              <p className="mt-2 text-ivory/90">{h.step3Text}</p>
              <div className="mt-5"><Button href={`/${locale}/miniaturas`} variant="ghost">{h.step3Cta}</Button></div>
            </li>
          </ol>
          <div className="mt-8"><Button href={`/${locale}/juego`} variant="ghost">{h.whatCta}</Button></div>
        </Section>
      </div>

      <Section title={h.factionsTitle} lead={h.factionsLead} compact>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {factions.map((f) => <FactionCard key={f.slug} f={f} locale={locale} />)}
        </div>
      </Section>

      <Section title={h.legendsTitle} lead={h.legendsLead} compact>
        <ul className="grid grid-cols-2 gap-4 md:gap-5 lg:grid-cols-4">
          {legends.map((m) => {
            const f = factions.find((x) => x.slug === m.faction)!;
            return (
              <li key={m.name}>
                <Link href={`/${locale}/tienda/${m.faction}/${m.slug}`} data-faction={f.theme} className="tilt-card group block">
                  <span className="spot flex aspect-square items-center justify-center p-5">
                    <Image src={m.img} alt={`Miniatura de ${m.name}`} width={480} height={480} loading="lazy" className="max-h-full w-auto object-contain" />
                  </span>
                  <span lang="es" className="mt-3 block font-display text-xl group-hover:text-gold">{m.name}</span>
                  <span className="mt-1 block text-sm text-accent">{f.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-8"><Button href={`/${locale}/miniaturas`} variant="ghost">{h.legendsCta}</Button></div>
      </Section>

      {/* Three divine laws */}
      <Section title={h.lawsTitle} lead={h.lawsLead} compact>
        <ol className="grid gap-5 pt-3 md:grid-cols-3">
          {laws.map((l, i) => (
            <li key={l.n} data-reveal data-delay={i + 1} className="relative border border-gold/25 bg-coal p-6 pt-10">
              <span className="absolute -top-5 left-6 grid h-10 w-10 place-items-center border border-gold bg-abyss font-display text-gold">{l.n}</span>
              <h3 lang="es" className="font-display text-xl text-gold">{l.name}</h3>
              <p lang="es" className="mt-3 text-ivory/85">{l.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-xs text-stone">{h.lawsNote}</p>
      </Section>

      {/* Primordial gods */}
      <div className="relative isolate overflow-hidden bg-[linear-gradient(180deg,#080a0d,#1b2a3a_50%,#080a0d)]">
        <Image src="/wiki/images/pante_n_celestial.webp" alt="" fill sizes="100vw" loading="lazy" className="-z-10 object-cover opacity-25" />
        <Section title={h.godsTitle} lead={h.godsLead} compact>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6">
            {gods.map((g, i) => {
              const p = getWikiPage(g.slug);
              return (
                <Link key={g.slug} href={`/${locale}/wikisphere/${g.slug}`} data-faction={g.theme} data-reveal data-delay={i + 1} className="tilt-card group relative block min-h-[10rem] sm:min-h-[16rem] md:min-h-[19rem] overflow-hidden border border-accent/40 bg-coal">
                  <Image src={g.img} alt={`${g.name}, ${h[g.epithet].toLowerCase()}`} fill sizes="(min-width:768px) 33vw, 100vw" loading="lazy" className="object-cover object-top transition duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-abyss via-abyss/40 to-transparent" aria-hidden />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <h3 className="font-display text-3xl">{g.name}</h3>
                    <p className="font-display text-xs uppercase tracking-widest text-accent">{h[g.epithet]}</p>
                    {p && <p className="mt-1 text-xs text-stone">{h.readOnWiki}</p>}
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="mt-8 flex flex-wrap gap-4">
            <Button href={`/${locale}/wikisphere/dioses/panteoncelestial`}>{h.pantheon}</Button>
            <Button href={`/${locale}/wikisphere?categoria=dioses`} variant="ghost">{h.allGods}</Button>
          </div>
        </Section>
      </div>

      {/* World of Saphir */}
      <div className="relative isolate overflow-hidden">
        <Image src="/wiki/images/esfera_de_saphir.webp" alt="" fill sizes="100vw" loading="lazy" className="-z-10 object-cover opacity-30" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-abyss via-abyss/40 to-abyss" aria-hidden />
        {/* Same content as before; on large screens the text sits beside the map instead of above it. */}
        <section data-reveal className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-12 md:py-16 lg:grid-cols-[minmax(0,24rem)_1fr] lg:gap-12">
          <div>
            <h2 className="font-display text-3xl tracking-wide text-ivory md:text-5xl">{h.worldTitle}</h2>
            <p className="mt-3 max-w-2xl text-stone">{h.worldText}</p>
            <hr className="rune-divider my-6" />
            <div className="flex flex-wrap gap-4">
              <Button href={`/${locale}/wikisphere`}>{h.worldCta}</Button>
              <Button href={`/${locale}/wikisphere/lugares/saphir`} variant="ghost">{h.sphere}</Button>
            </div>
          </div>
          <figure className="border border-gold/30 bg-abyss/80">
            <Image src="/wiki/images/mapa_saphir_2026.webp" alt={h.mapCaption} width={1600} height={1000} loading="lazy" className="h-auto w-full" />
            <figcaption className="p-3 text-xs uppercase tracking-widest text-stone">{h.mapCaption}</figcaption>
          </figure>
        </section>
      </div>

      {/* Histories: carousel on mobile/tablet, the original 4-column grid from lg */}
      <Section title={h.historyTitle} lead={h.historyLead} compact>
        <Carousel label={h.historyTitle} size="multi" gridFromLg labels={carousel}>
          {ages.map((a) => (
            <Link key={a.slug} href={`/${locale}/wikisphere/${a.slug}`} className="tilt-card group relative block aspect-[16/10] overflow-hidden border border-gold/25 bg-coal">
              <Image src={a.img} alt="" fill sizes="(min-width:1024px) 25vw, 82vw" loading="lazy" className="object-cover opacity-80 transition duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-abyss to-transparent" aria-hidden />
              <span className="absolute inset-x-0 bottom-0 p-4"><span className="block text-xs uppercase tracking-widest text-gold">{h.history}</span><span lang="es" className="font-display text-xl">{a.name}</span></span>
            </Link>
          ))}
        </Carousel>
      </Section>

      {/* Band builder: one compact strip, same tool and buttons */}
      <section data-reveal className="mx-auto max-w-7xl px-4 py-6 md:py-8">
        <div className="flex flex-col gap-5 border border-gold/25 bg-coal p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl tracking-wide text-ivory md:text-3xl">{h.builderTitle}</h2>
            <p className="mt-2 text-sm text-stone md:text-base">{h.builderText}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button href={`/${locale}/genera-tu-banda`}>{h.builderCta}</Button>
            <Button href={`/${locale}/genera-tu-banda`} variant="ghost">{h.builderPlay}</Button>
          </div>
        </div>
      </section>

      {/* News + events: two compact columns */}
      <section data-reveal className="mx-auto grid max-w-7xl gap-10 px-4 py-10 md:py-14 lg:grid-cols-2">
        <div data-wp-slot="home-news">
          <h2 className="font-display text-2xl tracking-wide text-ivory md:text-3xl"><BrandText text={h.newsTitle} /></h2>
          <hr className="rune-divider my-4" />
          {news.length === 0 ? (
            <Pending label={common.pendingLabel}>{h.newsEmpty}</Pending>
          ) : (
            <ul className="divide-y divide-gold/10 border border-gold/20 bg-coal">
              {news.map((n) => (
                <li key={n.id}>
                  <Link href={`/${locale}/novedades/${n.slug}`} className="block p-4 hover:bg-gold/5">
                    <span className="font-display text-xs uppercase tracking-widest text-gold">{n.category}{n.publish_at ? ` · ${new Date(n.publish_at).toLocaleDateString(locale)}` : ""}</span>
                    <span className="mt-1 block font-display text-lg">{n.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-5"><Button href={`/${locale}/novedades`} variant="ghost">{h.allNews}</Button></div>
        </div>

        <div data-wp-slot="home-events">
          <h2 className="font-display text-2xl tracking-wide text-ivory md:text-3xl">{h.eventsTitle}</h2>
          <hr className="rune-divider my-4" />
          {nextEvents.length === 0 ? (
            <Pending label={common.pendingLabel}>{h.eventsEmpty}</Pending>
          ) : (
            <ul className="divide-y divide-gold/10 border border-gold/20 bg-coal">
              {nextEvents.map((e) => (
                <li key={e.id}>
                  <Link href={`/${locale}/eventos/${e.slug}`} className="grid grid-cols-[4.5rem_1fr] items-center gap-3 p-4 hover:bg-gold/5">
                    <time dateTime={e.starts_at} className="font-display text-gold">{new Date(e.starts_at).toLocaleDateString(locale, { day: "numeric", month: "short" })}</time>
                    <span>{e.title}<span className="block text-xs text-stone">{[t.events.kinds[e.kind] ?? eventKinds[e.kind], e.city].filter(Boolean).join(" · ")}</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-5"><Button href={`/${locale}/eventos`} variant="ghost">{h.allEvents}</Button></div>
        </div>
      </section>

      {/* Final call to action */}
      <div className="relative isolate overflow-hidden bg-[radial-gradient(ellipse_at_center,#3a1510,#080a0d_70%)] py-28 text-center">
        <Image src="/wiki/images/portada_manadas_retrato_infernal_bajo_el_volc_n.webp" alt="" fill sizes="100vw" loading="lazy" className="-z-10 object-cover object-center opacity-40" />
        <Particles kind="embers" count={22} />
        <h2 className="font-display text-4xl uppercase tracking-widest md:text-6xl">{h.finalTitle}</h2>
        <div className="mt-8"><Button href={`/${locale}/juego`}>{h.finalCta}</Button></div>
      </div>

      {/* Contact (new, above the footer; replaces the old Community strip) */}
      <ContactSection locale={locale} />
    </>
  );
}
