import Image from "next/image";
import Link from "next/link";
import type { Dict, Locale } from "@/lib/i18n";
import type { ShopEntry } from "@/lib/shop/catalogue";
import { EntryStatus, itemText, pointsText } from "./facts-ui";
import { QuickAdd } from "./QuickAdd";

/** A faction's Starter Pack at the top of its shop page, with the same official data as the comparison. */
export function StarterBlock({ entry: e, t, open, locale }: { entry: ShopEntry; t: Dict; open: boolean; locale: Locale }) {
  const c = t.catalogue;
  const canAdd = open && e.status === "available" && e.product;
  return (
    <section aria-labelledby="faction-starter" className="grid gap-5 border border-accent/40 bg-coal p-4 sm:grid-cols-[10rem_1fr] md:gap-10 md:p-8 lg:grid-cols-[13rem_1fr_17rem]">
      {e.photo && <Link href={e.href} aria-hidden tabIndex={-1} className="mx-auto block w-36 sm:w-full"><Image src={e.photo} alt="" width={416} height={855} sizes="208px" loading="lazy" className="h-auto w-full" /></Link>}
      <div className="min-w-0">
        <h2 id="faction-starter" lang="es" className="font-display text-3xl leading-tight"><Link href={e.href} className="text-accent underline-offset-4 hover:underline">{e.name}</Link></h2>
        <p className="mt-1 font-display text-lg text-stone">Starter Pack</p>
        <p className="mt-3 max-w-xl leading-relaxed text-ivory/90">{c.packStyle[e.faction.slug]}</p>
        <h3 className="mt-5 font-display text-lg text-ivory">{t.shop.contents}</h3>
        <ul lang="es" className="mt-1 space-y-1 text-ivory/90">{e.items.map((i) => <li key={i}>{itemText(i, t)}</li>)}</ul>
      </div>
      <div className="flex flex-col gap-4 sm:col-span-2 lg:col-span-1 lg:border-l lg:border-accent/20 lg:pl-8">
        <dl className="grid grid-cols-2 gap-3">
          <div className="flex flex-col justify-between"><dt className="text-sm text-stone">{c.models}</dt><dd className="shop-num font-display text-2xl">{e.models ?? ""}</dd></div>
          <div className="flex flex-col justify-between"><dt className="text-sm text-stone">{c.points}</dt><dd className="shop-num font-display text-2xl">{pointsText(e, t) ?? ""}</dd></div>
        </dl>
        <div>
          {e.price && <p className="shop-num font-display text-4xl text-gold">{e.price}</p>}
          <EntryStatus entry={e} t={t} open={open} className="mt-1 block text-sm text-ivory/85" />
        </div>
        <div className="space-y-2">
          {canAdd && <QuickAdd locale={locale} labels={{ add: t.shop.add, added: t.shop.added, viewCart: t.shop.viewCart }} item={{ id: e.product!.id, slug: e.product!.slug, name: e.product!.name, price_cents: e.product!.price_cents!, image: e.photo, stock: e.product!.stock }} />}
          <Link href={e.href} className="btn inline-flex min-h-12 w-full items-center justify-center border border-gold/70 px-4 py-3 text-center font-display text-base text-ivory hover:border-gold hover:bg-gold/15">{c.viewPack}</Link>
        </div>
      </div>
    </section>
  );
}
