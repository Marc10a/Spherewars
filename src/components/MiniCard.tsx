import Image from "next/image";
import Link from "next/link";
import { dict, type Locale } from "@/lib/i18n";
import { characterInfo, miniVisual, type WikiPage } from "@/lib/wiki";

/** A miniature of a faction: official photo (or a marked placeholder), name, race and a short official excerpt. */
export function MiniCard({ page, locale, theme }: { page: WikiPage; locale: Locale; theme?: string }) {
  const t = dict[locale];
  const visual = miniVisual(page);
  const art = visual?.kind === "illustration";
  const info = characterInfo(page);
  return (
    <article data-faction={theme} className="tilt-card flex h-full flex-col overflow-hidden border border-accent/30 bg-coal">
      <Link href={`/${locale}/wikisphere/${page.slug}`} className={`relative block aspect-[4/5] ${art ? "bg-ivory" : "bg-abyss"}`} aria-label={page.title}>
        {visual ? (
          <>
            <Image src={visual.src} alt={page.title} fill sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw" loading="lazy" className={`object-contain ${art ? "mix-blend-multiply" : ""}`} />
            {art && <span className="absolute bottom-2 left-2 bg-abyss/80 px-2 py-0.5 text-[10px] uppercase tracking-widest text-gold">{t.factions.illustration}</span>}
          </>
        ) : (
          <span className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_40%,rgb(255_255_255/.08),transparent_60%)]">
            <span className="text-center">
              <span className="block font-display text-6xl text-accent/40" aria-hidden>{page.title.charAt(0)}</span>
              <span className="mt-2 block text-[10px] uppercase tracking-[0.3em] text-stone">{t.common.provisional}</span>
            </span>
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <h3 lang="es" className="font-display text-lg leading-tight">
          <Link href={`/${locale}/wikisphere/${page.slug}`} className="hover:text-accent">{page.title}</Link>
        </h3>
        {info.race && (
          <p className="font-display mt-1 text-xs uppercase tracking-widest text-accent">
            {t.factions.raceLabel}: <span lang="es">{info.race}</span>
          </p>
        )}
        {info.excerpt && <p lang="es" className="mt-3 line-clamp-5 flex-1 text-sm leading-relaxed text-ivory/80">{info.excerpt}</p>}
        <Link href={`/${locale}/wikisphere/${page.slug}`} className="mt-4 text-xs uppercase tracking-widest text-gold hover:text-ivory">{t.factions.readProfile}</Link>
      </div>
    </article>
  );
}
