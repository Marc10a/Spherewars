import Image from "next/image";
import Link from "next/link";
import type { Dict, Locale } from "@/lib/i18n";
import type { ShopEntry } from "@/lib/shop/catalogue";
import { EntryStatus, factLine } from "./facts-ui";
import { QuickAdd } from "./QuickAdd";

/**
 * Catalogue card of a product on sale. Only entries with a real photo reach it; the scene photo fades in on hover.
 * The name is the link and stretches over the whole card; the add button sits above it, so one tap buys and any other tap opens the product.
 */
export function ShopTile({ entry: e, t, locale, open, showFaction = false, priority = false }: { entry: ShopEntry & { photo: string }; t: Dict; locale: Locale; open: boolean; showFaction?: boolean; priority?: boolean }) {
  const facts = factLine(e, t);
  const canAdd = open && e.status === "available" && e.product && e.product.price_cents;
  return (
    <article data-faction={e.faction.theme} className="shop-tile group">
      <span className="spot relative block aspect-square overflow-hidden">
        <Image src={e.photo} alt="" fill sizes="(min-width:1280px) 22vw, (min-width:768px) 30vw, 50vw" priority={priority} loading={priority ? undefined : "lazy"} className={`shop-tile-mini ${e.photoFills ? "object-cover object-[50%_75%]" : "object-contain p-4"}`} />
        {e.scene && <Image src={e.scene} alt="" fill sizes="(min-width:1280px) 22vw, 30vw" loading="lazy" className="shop-tile-scene object-cover object-[50%_75%]" />}
        {showFaction && <Image src={`/brand/factions/${e.faction.slug}.webp`} alt="" width={40} height={40} loading="lazy" className="shop-tile-crest" />}
        {e.status === "soldOut" && <span className="shop-tile-flag">{t.shop.soldOut}</span>}
      </span>
      <div className="flex flex-1 flex-col gap-1 border-t border-accent/20 px-3 pb-3 pt-3 sm:px-4 sm:pb-4">
        <h3 lang="es" className="font-display text-lg leading-tight text-ivory">
          <Link href={e.href} className="shop-tile-link">{e.name}</Link>
        </h3>
        {showFaction && <span className="text-sm text-accent">{e.faction.name}</span>}
        {facts && <span className="text-sm text-stone">{facts}</span>}
        <div className="shop-tile-buy">
          {e.price && <span className="shop-num font-display text-2xl leading-none text-gold">{e.price}</span>}
          {canAdd
            ? <QuickAdd compact locale={locale} labels={{ add: t.catalogue.addShort, addLong: t.shop.add, added: t.shop.added, viewCart: t.shop.viewCart }} item={{ id: e.product!.id, slug: e.product!.slug, name: e.product!.name, price_cents: e.product!.price_cents!, image: e.photo, stock: e.product!.stock }} />
            : e.status !== "soldOut" && <EntryStatus entry={e} t={t} open={open} className="text-sm text-ivory/85" />}
        </div>
      </div>
    </article>
  );
}
