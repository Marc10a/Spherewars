import Image from "next/image";
import Link from "next/link";
import type { Dict } from "@/lib/i18n";
import type { ShopEntry } from "@/lib/shop/catalogue";
import { EntryStatus, factLine } from "./facts-ui";

/** Catalogue card of a product on sale. Only entries with a real photo reach it; the scene photo fades in on hover. */
export function ShopTile({ entry: e, t, open, showFaction = false, priority = false }: { entry: ShopEntry & { photo: string }; t: Dict; open: boolean; showFaction?: boolean; priority?: boolean }) {
  const facts = factLine(e, t);
  return (
    <Link href={e.href} data-faction={e.faction.theme} className="shop-tile group">
      <span className="spot relative block aspect-square overflow-hidden">
        <Image src={e.photo} alt="" fill sizes="(min-width:1280px) 22vw, (min-width:768px) 30vw, 50vw" priority={priority} loading={priority ? undefined : "lazy"} className={`shop-tile-mini ${e.photoFills ? "object-cover object-[50%_75%]" : "object-contain p-4"}`} />
        {e.scene && <Image src={e.scene} alt="" fill sizes="(min-width:1280px) 22vw, 30vw" loading="lazy" className="shop-tile-scene object-cover object-[50%_75%]" />}
      </span>
      <span className="flex flex-1 flex-col gap-1 border-t border-accent/20 px-3 py-3 sm:px-4">
        <span lang="es" className="font-display text-lg leading-tight text-ivory transition-colors duration-200 group-hover:text-accent group-focus-visible:text-accent">{e.name}</span>
        {showFaction && <span className="text-sm text-accent">{e.faction.name}</span>}
        {facts && <span className="text-sm text-stone">{facts}</span>}
        <span className="mt-auto flex flex-wrap items-baseline justify-between gap-x-3 pt-1">
          {e.price && <span className="shop-num font-display text-xl text-gold">{e.price}</span>}
          <EntryStatus entry={e} t={t} open={open} className="text-sm text-ivory/85" />
        </span>
      </span>
    </Link>
  );
}
