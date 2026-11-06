import Image from "next/image";
import Link from "next/link";
import { dict, type Locale } from "@/lib/i18n";
import { factions } from "@/content/factions";
import { elementFor } from "@/lib/element";
import { characterArt, getWikiPage } from "@/lib/wiki";
import { Button, Section } from "@/components/ui";
import { Carousel } from "@/components/Carousel";
import { ElementCanvas } from "@/components/ElementCanvas";
import { FogMap } from "@/components/fx/FogMap";

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
  { name: "Liehhan, el Oso", faction: "adeptos-de-malesur", slug: "personajes/adeptos-de-malesur/liehhan" },
  { name: "Raggarth, el Liberador", faction: "vastagos-de-kurgan", slug: "personajes/vastagos-de-kurgan/raggarth" },
  { name: "Pyronus, el Heraldo", faction: "manadas-de-urueh", slug: "personajes/mandas-de-urueh/pyronus" },
  { name: "Róxter, el Piloto", faction: "alianza", slug: "personajes/alianza/roxter" },
];

const ages = [
  { slug: "historia/saphir", name: "Saphir", img: "/wiki/images/cronolog_a_de_saphir_horizontal.webp" },
  { slug: "historia/hijos-de-kazag", name: "Hijos de Kazag", img: "/wiki/images/cronolog_a_kazag_horizontal.webp" },
  { slug: "historia/hijos-de-kurgan", name: "Hijos de Kurgan", img: "/wiki/images/cronolog_a_de_kurgan_horizontal.webp" },
  { slug: "historia/hijos-de-malesur", name: "Hijos de Malesur", img: "/wiki/images/cronolog_a_de_malesur_horitzontal.webp" },
];

/** The world of Saphir at a glance: entrance of WikiSphere, before the article index. */
export function LoreOverview({ locale }: { locale: Locale }) {
  const t = dict[locale];
  const h = t.home;
  const carousel = { prev: h.prev, next: h.next, slide: h.slideOf };
  return (
    <>
      <div className="relative isolate overflow-hidden">
        {/* Starts right under the hero, so it is above the fold on phones (often the largest paint there): not lazy. */}
        <Image src="/wiki/images/esfera_de_saphir.webp" alt="" fill sizes="100vw" loading="eager" className="-z-10 object-cover opacity-30" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-abyss via-abyss/40 to-abyss" aria-hidden />
        <section data-reveal className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-12 md:py-16 lg:grid-cols-[minmax(0,24rem)_1fr] lg:gap-12">
          <div>
            <h2 className="font-display text-3xl tracking-wide text-ivory md:text-5xl">{h.worldTitle}</h2>
            <p className="mt-3 max-w-2xl text-lg text-ivory/90">{h.worldText}</p>
            <div className="mt-6"><Button href={`/${locale}/wikisphere/lugares/saphir`} variant="ghost">{h.sphere}</Button></div>
          </div>
          <figure className="border border-gold/30 bg-abyss/80">
            <FogMap src="/wiki/images/mapa_saphir_2026.webp" alt={h.mapCaption} width={1459} height={1078} />
            <figcaption className="p-3 font-display text-sm text-stone">{h.mapCaption}</figcaption>
          </figure>
        </section>
      </div>

      <div className="relative isolate overflow-hidden bg-[linear-gradient(180deg,#080a0d,#1b2a3a_50%,#080a0d)]">
        <Image src="/wiki/images/pante_n_celestial.webp" alt="" fill sizes="100vw" loading="lazy" className="-z-10 object-cover opacity-25" />
        <Section title={h.godsTitle} lead={h.godsLead} compact>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6">
            {gods.map((g, i) => {
              const p = getWikiPage(g.slug);
              return (
                <Link key={g.slug} href={`/${locale}/wikisphere/${g.slug}`} data-faction={g.theme} data-element-host data-reveal data-delay={i + 1} className="tilt-card group relative block min-h-[10rem] overflow-hidden border border-accent/40 bg-coal sm:min-h-[16rem] md:min-h-[19rem]">
                  <Image src={g.img} alt={`${g.name}, ${h[g.epithet].toLowerCase()}`} fill sizes="(min-width:768px) 33vw, 100vw" loading="lazy" className="object-cover object-top transition duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-abyss via-abyss/40 to-transparent" aria-hidden />
                  <ElementCanvas element={elementFor(g.theme)!} mode="hover" density={1.5} />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <h3 className="font-display text-3xl">{g.name}</h3>
                    <p className="font-display text-sm text-accent">{h[g.epithet]}</p>
                    {p && <p className="mt-1 text-sm text-stone">{h.readOnWiki}</p>}
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

      <Section title={h.lawsTitle} lead={h.lawsLead} compact>
        <ol className="grid gap-8 pt-3 md:grid-cols-3 md:gap-5">
          {laws.map((l, i) => (
            <li key={l.n} data-reveal data-delay={i + 1} className="relative border border-gold/25 bg-coal p-6 pt-10">
              <span className="absolute -top-5 left-6 grid h-10 w-10 place-items-center border border-gold bg-abyss font-display text-gold">{l.n}</span>
              <h3 lang="es" className="font-display text-xl text-gold">{l.name}</h3>
              <p lang="es" className="mt-3 text-ivory/85">{l.text}</p>
            </li>
          ))}
        </ol>
        {locale !== "es" && <p className="mt-6 text-sm text-stone">{h.lawsNote}</p>}
      </Section>

      <Section title={h.historyTitle} lead={h.historyLead} compact>
        <Carousel label={h.historyTitle} size="multi" gridFromLg labels={carousel}>
          {ages.map((a) => (
            <Link key={a.slug} href={`/${locale}/wikisphere/${a.slug}`} className="tilt-card group relative block aspect-[16/10] overflow-hidden border border-gold/25 bg-coal">
              <Image src={a.img} alt="" fill sizes="(min-width:1024px) 25vw, 82vw" loading="lazy" className="object-cover opacity-80 transition duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-abyss to-transparent" aria-hidden />
              <span className="absolute inset-x-0 bottom-0 p-4"><span className="block font-display text-sm text-gold">{h.history}</span><span lang="es" className="font-display text-xl">{a.name}</span></span>
            </Link>
          ))}
        </Carousel>
      </Section>

      <Section title={h.legendsTitle} lead={h.legendsLead} compact>
        <ul className="grid grid-cols-2 gap-4 md:gap-5 lg:grid-cols-4">
          {legends.map((m) => {
            const f = factions.find((x) => x.slug === m.faction)!;
            const art = characterArt(m.slug);
            return (
              <li key={m.name}>
                <Link href={`/${locale}/wikisphere/${m.slug}`} data-faction={f.theme} className="tilt-card group block">
                  <span className={`relative block aspect-[4/5] ${art?.bg === "light" ? "bg-ivory" : "spot"}`}>
                    {art && <Image src={art.src} alt={m.name} fill sizes="(min-width:1024px) 25vw, 50vw" loading="lazy" className={`object-contain p-3 ${art.bg === "light" ? "mix-blend-multiply" : ""}`} />}
                  </span>
                  <span lang="es" className="mt-3 block font-display text-xl group-hover:text-gold">{m.name}</span>
                  <span className="mt-1 block text-sm text-accent">{f.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Section>
    </>
  );
}
