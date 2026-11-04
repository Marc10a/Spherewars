import Image from "next/image";
import Link from "next/link";
import type { Dict, Locale } from "@/lib/i18n";
import { sortEntries, type ShopEntry, type ShopSort } from "@/lib/shop/catalogue";
import { EntryStatus, itemText, pointsText } from "./facts-ui";
import { QuickAdd } from "./QuickAdd";

const addLabels = (t: Dict) => ({ add: t.shop.add, added: t.shop.added, viewCart: t.shop.viewCart });

function Price({ e, t, open, big = false }: { e: ShopEntry; t: Dict; open: boolean; big?: boolean }) {
  return (
    <>
      {e.price && <span className={`shop-num block font-display text-gold ${big ? "text-3xl" : "text-2xl"}`}>{e.price}</span>}
      <EntryStatus entry={e} t={t} open={open} className={e.price ? "mt-1 block text-sm text-ivory/85" : "block font-display text-lg text-stone"} />
    </>
  );
}

function Actions({ e, t, open, locale }: { e: ShopEntry; t: Dict; open: boolean; locale: Locale }) {
  const canAdd = open && e.status === "available" && e.product;
  return (
    <div className="space-y-2">
      {canAdd && <QuickAdd locale={locale} labels={addLabels(t)} item={{ id: e.product!.id, slug: e.product!.slug, name: e.product!.name, price_cents: e.product!.price_cents!, image: e.photo, stock: e.product!.stock }} />}
      <Link href={e.href} className="btn inline-flex min-h-12 w-full items-center justify-center border border-gold/70 px-4 py-3 text-center font-display text-base text-ivory hover:border-gold hover:bg-gold/15">
        {t.catalogue.viewPack}<span className="sr-only">: {e.name}</span>
      </Link>
    </div>
  );
}

function Contents({ e, t }: { e: ShopEntry; t: Dict }) {
  return <ul lang="es" className="space-y-1 text-sm leading-snug text-ivory/90">{e.items.map((i) => <li key={i}>{itemText(i, t)}</li>)}</ul>;
}

/** The four Starter Packs side by side with their official data: a real table on wide screens, stacked cards on phones. */
export function StarterCompare({ packs, t, open, locale, orden, id }: { packs: ShopEntry[]; t: Dict; open: boolean; locale: Locale; orden: ShopSort | null; id?: string }) {
  const c = t.catalogue;
  const list = sortEntries(packs, orden);
  const row = (label: string, cell: (e: ShopEntry) => React.ReactNode) => (
    <tr>
      <th scope="row" className="sc-rowhead">{label}</th>
      {list.map((e) => <td key={e.key} data-faction={e.faction.theme}>{cell(e)}</td>)}
    </tr>
  );
  return (
    <section id={id} aria-labelledby="start-here" className="mx-auto max-w-7xl px-4 pt-10 md:pt-14">
      <h2 id="start-here" className="font-display text-3xl tracking-wide text-ivory md:text-4xl">{c.startHere}</h2>
      <p className="mt-2 max-w-2xl text-ivory/85">{c.startLead}</p>

      {/* Wide screens */}
      <table className="sc-table mt-6 hidden w-full table-fixed border-collapse lg:table">
        <caption className="sr-only">{c.compareCaption}</caption>
        <thead>
          <tr>
            <td className="sc-rowhead w-40" />
            {list.map((e) => (
              <th key={e.key} scope="col" data-faction={e.faction.theme} className="sc-head">
                <Link href={e.href} className="group block">
                  {e.photo && (
                    <span className="sc-photo">
                      <Image src={e.photo} alt="" width={365} height={750} sizes="170px" loading="lazy" className="h-72 w-auto" />
                    </span>
                  )}
                  <span lang="es" className="mt-4 block font-display text-2xl leading-tight text-accent">{e.name}</span>
                  <span className="mt-1 block font-sans text-sm font-normal text-stone">{e.faction.name}</span>
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {row(c.price, (e) => <Price e={e} t={t} open={open} big />)}
          {row(c.models, (e) => <span className="shop-num font-display text-2xl text-ivory">{e.models ?? ""}</span>)}
          {row(c.points, (e) => <span className="shop-num font-display text-2xl text-ivory">{pointsText(e, t) ?? ""}</span>)}
          {row(t.shop.contents, (e) => <Contents e={e} t={t} />)}
          {row(c.playstyle, (e) => <p className="text-sm leading-relaxed text-ivory/85">{c.packStyle[e.faction.slug]}</p>)}
          <tr>
            <td className="sc-rowhead" />
            {list.map((e) => <td key={e.key} data-faction={e.faction.theme}><Actions e={e} t={t} open={open} locale={locale} /></td>)}
          </tr>
        </tbody>
      </table>

      {/* Phones and tablets */}
      <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:hidden">
        {list.map((e) => (
          <li key={e.key} data-faction={e.faction.theme} className="border border-accent/30 bg-coal p-4">
            <div className="grid grid-cols-[6.5rem_1fr] gap-4">
              {e.photo && (
                <Link href={e.href} aria-hidden tabIndex={-1} className="block self-start">
                  <Image src={e.photo} alt="" width={208} height={428} sizes="104px" loading="lazy" className="h-auto w-full" />
                </Link>
              )}
              <div className="min-w-0">
                <h3 lang="es" className="font-display text-2xl leading-tight"><Link href={e.href} className="text-accent">{e.name}</Link></h3>
                <p className="mt-1 text-sm text-stone">{e.faction.name}</p>
                <div className="mt-3"><Price e={e} t={t} open={open} /></div>
                <dl className="mt-3 grid grid-cols-2 gap-2">
                  <div className="flex flex-col justify-between"><dt className="text-sm text-stone">{c.models}</dt><dd className="shop-num font-display text-xl">{e.models ?? ""}</dd></div>
                  <div className="flex flex-col justify-between"><dt className="text-sm text-stone">{c.points}</dt><dd className="shop-num font-display text-xl">{pointsText(e, t) ?? ""}</dd></div>
                </dl>
              </div>
            </div>
            <div className="mt-4 border-t border-accent/20 pt-4"><Contents e={e} t={t} /></div>
            <p className="mt-3 text-sm leading-relaxed text-ivory/85">{c.packStyle[e.faction.slug]}</p>
            <div className="mt-4"><Actions e={e} t={t} open={open} locale={locale} /></div>
          </li>
        ))}
      </ul>
    </section>
  );
}
