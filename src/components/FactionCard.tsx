import Image from "next/image";
import Link from "next/link";
import type { Faction } from "@/content/factions";
import { dict, type Locale } from "@/lib/i18n";
import { factionCharacters } from "@/lib/wiki";

export function FactionCard({ f, locale }: { f: Faction; locale: Locale }) {
  const count = factionCharacters(f.slug).length;
  return (
    <Link
      href={`/${locale}/facciones/${f.slug}`}
      data-faction={f.theme}
      className="tilt-card group relative flex min-h-[26rem] flex-col justify-end overflow-hidden border border-white/10 p-6"
      style={{ background: f.gradient }}
    >
      <Image src={f.image} alt="" fill sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw" className="object-cover object-top transition duration-700 group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-abyss via-abyss/50 to-transparent" aria-hidden />
      {count > 0 && (
        <span className="absolute right-3 top-3 border border-accent/60 bg-abyss/80 px-2 py-1 text-[10px] uppercase tracking-widest text-accent">
          {count} {dict[locale].factions.minisCount}
        </span>
      )}
      <div className="relative">
        <h3 className="font-display text-2xl text-ivory">{f.name}</h3>
        <p className="mt-2 text-sm text-ivory/85">{f.blurb[locale]}</p>
        <p className="mt-2 text-xs uppercase tracking-wider text-accent">{f.style[locale]}</p>
      </div>
    </Link>
  );
}

/** One faction as a full-width slide for the home carousel: same art, gradient, accent colour and links as the card. */
export function FactionSlide({ f, locale }: { f: Faction; locale: Locale }) {
  const t = dict[locale];
  const count = factionCharacters(f.slug).length;
  return (
    <article data-faction={f.theme} className="relative grid overflow-hidden border border-white/10 lg:grid-cols-[1fr_1.15fr]" style={{ background: f.gradient }}>
      <Link href={`/${locale}/facciones/${f.slug}`} aria-label={f.name} className="group relative block min-h-[16rem] sm:min-h-[22rem]">
        <Image src={f.image} alt="" fill sizes="(min-width:1024px) 45vw, 100vw" className="object-cover object-top transition duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-abyss/80 via-abyss/20 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-abyss/90" aria-hidden />
      </Link>
      <div className="relative flex flex-col justify-center gap-4 bg-abyss/60 p-6 sm:p-8 lg:bg-abyss/70 lg:p-10">
        {count > 0 && <p className="text-xs uppercase tracking-widest text-accent">{count} {t.factions.minisCount}</p>}
        <h3 className="font-display text-3xl text-ivory md:text-4xl">{f.name}</h3>
        <p className="text-ivory/85">{f.blurb[locale]}</p>
        <p className="text-xs uppercase tracking-wider text-accent">{f.style[locale]}</p>
        {f.subfactions && <p className="text-sm text-stone">{f.subfactions.map((s) => s.name).join(" · ")}</p>}
        <div className="mt-2 flex flex-wrap gap-3">
          <Link href={`/${locale}/facciones/${f.slug}`} className="bg-accent px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-abyss transition hover:bg-ivory">{t.home.factionEnter}</Link>
          <Link href={`/${locale}/tienda/${f.slug}`} className="border border-accent/70 px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-accent transition hover:bg-accent/10">{t.home.factionShop}</Link>
        </div>
      </div>
    </article>
  );
}
