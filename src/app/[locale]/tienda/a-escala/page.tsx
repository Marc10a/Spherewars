import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { dict, isLocale, type Dict, type Locale } from "@/lib/i18n";
import { staticMeta } from "@/lib/seo";
import { factions, getFaction } from "@/content/factions";
import { shopReadiness } from "@/lib/shop/settings";
import { listSellableProducts } from "@/lib/data";
import { buildCatalogue, type ShopEntry } from "@/lib/shop/catalogue";
import { productFacts } from "@/lib/shop/facts";
import { cutoutOf, localNum, scaleAnchor, scaleFigure, scaleHref, type ScaleOrder as Orden } from "@/lib/shop/scale";
import { ScaleThumb, ScaleWall, type Figure, type WallFigure } from "@/components/shop/ScaleLineup";
import { FactionPicks } from "@/components/shop/ShopFilters";
import { ShopHero } from "@/components/shop/ShopHero";
import { CatalogueEmpty } from "@/components/shop/CatalogueEmpty";
import { QuickAdd } from "@/components/shop/QuickAdd";
import { EntryStatus } from "@/components/shop/facts-ui";

export const generateMetadata = staticMeta({ title: (t) => t.scale.title, description: (t) => t.scale.lead, path: "/tienda/a-escala" });

type Row = { e: ShopEntry; fig: Figure | null };

const spec = (key: string, label: string) => productFacts(key)?.specs.find((s) => s.label === label)?.value ?? null;
/** "40 mm" never splits across lines. */
const nb = (v: string) => v.replace(/ /g, "\u00a0");
const byHeight = (a: Row, b: Row) => a.fig!.heightMm - b.fig!.heightMm || a.e.name.localeCompare(b.e.name, "es");

/**
 * Every single miniature of the shop at its official height, on one scale shared by the whole page (the tallest miniature sets it,
 * whatever the filter), grouped by faction or all together by height. Packs are left out; a miniature without an official height or
 * a cut-out photo goes to its own list and is never drawn.
 */
export default async function Page({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ faccion?: string | string[]; orden?: string | string[] }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dict[locale];
  const s = t.scale;
  const sp = await searchParams;
  const active = typeof sp.faccion === "string" ? getFaction(sp.faccion)?.slug ?? null : null;
  const orden: Orden = sp.orden === "altura" ? "altura" : null;
  const [ready, products] = await Promise.all([shopReadiness(), listSellableProducts()]);
  const open = ready.canCheckout;
  const { singles, unlisted } = buildCatalogue(products, locale);

  const rows: Row[] = [...singles, ...unlisted].map((e) => ({ e, fig: scaleFigure(e.key, e.href, locale, t, e.name) }));
  const measured = rows.filter((r) => r.fig);
  const refMm = Math.max(...measured.map((r) => r.fig!.heightMm));
  const mine = (r: Row) => !active || r.e.faction.slug === active;
  const shown = measured.filter(mine);
  const groups = orden === "altura" || active
    ? [{ faction: active ? getFaction(active)! : null, list: [...shown].sort(byHeight) }]
    : factions.map((f) => ({ faction: f, list: shown.filter((r) => r.e.faction.slug === f.slug).sort(byHeight) })).filter((g) => g.list.length);
  const drawn = groups.flatMap((g) => g.list);
  // Only real products: on sale, or with the owner's product document. Wiki characters with neither are not shop miniatures.
  const missing = rows.filter((r) => !r.fig && mine(r) && (r.e.status !== "unlisted" || productFacts(r.e.key)));
  const unit = (n: number) => `${n} ${s.count[n === 1 ? 0 : 1]}`;
  const countOf = (slug: string | null) => measured.filter((r) => !slug || r.e.faction.slug === slug).length;
  const onSale = rows.filter((r) => r.e.status !== "unlisted").length;
  const current = active ? getFaction(active) : null;
  const wall = (list: Row[]): WallFigure[] => list.map(({ e, fig }) => ({ ...fig!, id: scaleAnchor(e.key), theme: e.faction.theme }));

  return (
    <div data-faction={current?.theme}>
      <ShopHero t={t} title={s.title} lead={s.lead} theme={current?.theme} image={current?.image ?? "/wiki/images/portada_manadas_retrato_infernal_bajo_el_volc_n.webp"} count={onSale} open={open} locale={locale} />
      <FactionPicks label={t.shop.factionsTitle} allLabel={t.shop.allShop} active={active} href={(slug) => scaleHref(locale, slug, orden)} count={countOf} unit={unit} />

      <div className="shop-bar" data-faction={current?.theme}>
        <div className="mx-auto flex max-w-7xl items-center gap-x-4 px-4 py-2.5">
          <p role="status" className="shop-num hidden min-w-0 flex-1 font-display text-lg text-ivory md:block">{unit(drawn.length)}</p>
          <div role="group" aria-label={s.order} className="shop-seg max-md:flex-1">
            {([[null, s.byFaction, s.byFaction], ["altura", s.byHeight, s.byHeightLong]] as [Orden, string, string][]).map(([v, label, long]) => (
              <Link key={label} scroll={false} prefetch={false} href={scaleHref(locale, active, v)} aria-current={orden === v ? "true" : undefined} title={long} className={`shop-seg-item${orden === v ? " is-on" : ""}`}>{label}</Link>
            ))}
          </div>
        </div>
      </div>

      <div key={`${active}-${orden}`} className="shop-results mx-auto max-w-7xl px-4 pt-6 md:pt-8">
        <p className="max-w-[70ch] text-base text-ivory/85">{s.grid} <span className="sm:hidden">{s.swipe}</span></p>
        {groups.map((g) => {
          const id = `scale-${g.faction?.slug ?? "all"}`;
          const title = !active && orden === "altura" ? s.byHeightLong : g.faction?.name ?? s.byHeightLong;
          return (
            <section key={id} aria-labelledby={id} data-faction={g.faction?.theme} className="pt-8 md:pt-10">
              <div className="shop-sec-head">
                {g.faction && <Image src={`/brand/factions/${g.faction.slug}.webp`} alt="" width={64} height={64} loading="lazy" className="h-11 w-auto shrink-0 object-contain md:h-12" />}
                <h2 id={id} className={`min-w-0 flex-1 font-display text-2xl tracking-wide md:text-3xl ${g.faction ? "text-accent" : "text-ivory"}`}>{title}</h2>
                <p className="shop-num whitespace-nowrap text-base text-stone">{unit(g.list.length)}</p>
              </div>
              <ScaleWall figures={wall(g.list)} refMm={refMm} label={s.drawing.replace("{group}", g.faction?.name ?? s.all)} />
            </section>
          );
        })}
        {!drawn.length && (
          <div className="pt-8">
            <CatalogueEmpty text={s.noFigures} emblem={current ? `/brand/factions/${current.slug}.webp` : undefined} actions={[{ href: scaleHref(locale, null, orden), label: t.catalogue.emptyAll, solid: true }]} />
          </div>
        )}
      </div>

      {drawn.length > 0 && (
        <section aria-labelledby="scale-list" className="mx-auto max-w-7xl px-4 pt-16 md:pt-20">
          <h2 id="scale-list" className="font-display text-3xl tracking-wide md:text-4xl">{s.listTitle}</h2>
          <p className="mt-2 max-w-[70ch] text-base text-ivory/85">{s.listLead}</p>
          <ul className="mt-6 grid border-t border-gold/15 lg:grid-cols-2 lg:gap-x-10">
            {drawn.map((r) => <ScaleRow key={r.e.key} row={r} refMm={refMm} t={t} locale={locale} open={open} />)}
          </ul>
        </section>
      )}

      {missing.length > 0 && (
        <section aria-labelledby="scale-missing" className="mx-auto max-w-7xl px-4 pt-16 md:pt-20">
          <h2 id="scale-missing" className="font-display text-3xl tracking-wide md:text-4xl">{s.unmeasuredTitle}</h2>
          <p className="mt-2 max-w-[70ch] text-base text-ivory/85">{s.unmeasuredLead}</p>
          <ul className="mt-6 grid border-t border-gold/15 lg:grid-cols-2 lg:gap-x-10">
            {missing.map((r) => <ScaleRow key={r.e.key} row={r} refMm={refMm} t={t} locale={locale} open={open} />)}
          </ul>
        </section>
      )}
      <div className="pb-16 md:pb-24" />
    </div>
  );
}

/** One line of the list: silhouette at scale (or the faction's emblem when there is no measure), official facts, price and the add button. */
function ScaleRow({ row: { e, fig }, refMm, t, locale, open }: { row: Row; refMm: number; t: Dict; locale: Locale; open: boolean }) {
  const s = t.scale;
  const height = spec(e.key, "Altura");
  const base = spec(e.key, "Peana");
  const facts = [
    height ? `${t.shop.factHeight} ${nb(localNum(height, locale, t))}` : s.noHeight,
    base && `${t.shop.factBase} ${nb(localNum(base, locale, t))}`,
    !fig && height && !cutoutOf(e.key) && s.noCutout,
  ].filter(Boolean).join(" · ");
  const canAdd = open && e.status === "available" && e.product && e.product.price_cents;
  return (
    <li data-faction={e.faction.theme} className="relative flex items-center gap-3 border-b border-gold/15 py-3 sm:gap-5">
      {fig ? <ScaleThumb f={fig} refMm={refMm} /> : <span className="scale-thumb is-empty" aria-hidden><Image src={`/brand/factions/${e.faction.slug}.webp`} alt="" width={40} height={40} loading="lazy" className="h-8 w-auto object-contain opacity-70" /></span>}
      <div className="min-w-0 flex-1">
        <Link href={e.href} lang="es" className="inline-flex min-h-11 items-center font-display text-lg leading-tight text-ivory underline-offset-4 hover:text-accent hover:underline">{e.name}</Link>
        <p className="text-sm text-stone"><span className="text-accent">{e.faction.name}</span> · {facts}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-4">
        {e.price && <span className="shop-num font-display text-xl leading-none text-gold">{e.price}</span>}
        {canAdd
          ? <QuickAdd compact locale={locale} labels={{ add: t.catalogue.addShort, addLong: t.shop.add, added: t.shop.added, viewCart: t.shop.viewCart }} item={{ id: e.product!.id, slug: e.product!.slug, name: e.product!.name, price_cents: e.product!.price_cents!, image: e.photo, stock: e.product!.stock }} />
          : <EntryStatus entry={e} t={t} open={open} className="max-w-[8rem] text-right text-sm text-ivory/85" />}
      </div>
    </li>
  );
}
