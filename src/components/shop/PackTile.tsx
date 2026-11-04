import Image from "next/image";
import Link from "next/link";
import type { Pack } from "@/lib/shop/packs";

/** Catalogue card of a Starter Pack: its photo and its name, like the miniature cards. */
export function PackTile({ pack, href, theme, priority = false, price }: { price?: string | null; pack: Pack; href: string; theme?: string; priority?: boolean }) {
  return (
    <Link href={href} data-faction={theme} className="tilt-card group block overflow-hidden border border-accent/40 bg-coal">
      <span className="relative block aspect-[2/3] bg-abyss">
        {pack.image && (
          <Image src={pack.image} alt={pack.title} fill sizes="(min-width:1280px) 22vw, (min-width:768px) 30vw, 50vw" priority={priority} loading={priority ? undefined : "lazy"}
            className="object-contain transition-transform duration-500 ease-out group-hover:scale-[1.03]" />
        )}
      </span>
      <span lang="es" className="block px-3 py-3 text-center font-display text-base font-semibold leading-tight text-accent group-hover:text-ivory sm:text-base">{pack.title}{price && <span className="mt-1 block text-gold">{price}</span>}</span>
    </Link>
  );
}
