import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { dict } from "@/lib/i18n";
import { miniVisual, type WikiPage } from "@/lib/wiki";

/** Catalogue card: the photo and the name, nothing else. Price, quantity and buy buttons live on the product page. */
export function ShopTile({ page, href, theme, locale, priority = false }: { page: WikiPage; href: string; theme?: string; locale: Locale; priority?: boolean }) {
  const visual = miniVisual(page);
  const art = visual?.kind === "illustration";
  return (
    <Link href={href} data-faction={theme} className="tilt-card group block overflow-hidden border border-accent/25 bg-coal">
      <span className={`relative block aspect-[2/3] ${art ? "bg-ivory" : "bg-abyss"}`}>
        {visual ? (
          <Image src={visual.src} alt={page.title} fill sizes="(min-width:1280px) 22vw, (min-width:768px) 30vw, 50vw" priority={priority} loading={priority ? undefined : "lazy"}
            className={`object-contain transition duration-700 group-hover:scale-105 ${art ? "mix-blend-multiply" : ""}`} />
        ) : (
          <span className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_40%,rgb(255_255_255/.08),transparent_60%)]">
            <span className="text-center">
              <span className="block font-display text-6xl text-accent/40" aria-hidden>{page.title.charAt(0)}</span>
              <span className="mt-2 block text-[10px] uppercase tracking-[0.3em] text-stone">{dict[locale].common.provisional}</span>
            </span>
          </span>
        )}
      </span>
      <span lang="es" className="block px-3 py-3 text-center font-display text-sm leading-tight group-hover:text-accent sm:text-base">{page.title}</span>
    </Link>
  );
}
