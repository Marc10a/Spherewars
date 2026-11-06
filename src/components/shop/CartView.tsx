"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { useFormStatus } from "react-dom";
import { Lock, Minus, Plus, Trash2 } from "lucide-react";
import { links } from "@/content/site";
import { SHIPPING_INFO, shippingInfoText } from "@/lib/shop/shipping-info";
import { cartActions, useCart } from "./cart-store";
import { checkLines, computeCart, formatMoney, MAX_QTY_PER_LINE, shippableCountries, zoneFor, type ShopProduct, type ShopSettings } from "@/lib/shop/pricing";
import type { Dict } from "@/lib/i18n";
import { startCheckout } from "@/app/[locale]/tienda/actions";

function CheckoutButton({ disabled, label }: { disabled: boolean; label: string }) {
  const { pending } = useFormStatus(); // each submit reserves stock: never send it twice
  return <button disabled={disabled || pending} aria-busy={pending} className="btn btn-solid min-h-13 bg-gold px-6 py-3 font-display text-lg tracking-[0.03em] text-abyss hover:bg-ivory disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-gold">{label}</button>;
}

/** What the current catalogue says about a product, keyed by product id. `live` is null when the catalogue could not be read: then nothing is flagged. */
export type LiveProduct = { price_cents: number; stock: number | null; href: string };

type Props = {
  locale: "es" | "en" | "ca";
  settings: ShopSettings;
  canCheckout: boolean;
  addressAtCheckout?: boolean; // WooCommerce: no country or shipping amount here, its checkout settles them with the real address
  labels: Dict["shop"];
  notice: string | null; // already-localized message coming from the server (?e=...)
  live?: Record<string, LiveProduct> | null;
  failedLine?: string | null; // product id from ?line=, when the checkout said which line failed (WooCommerce only)
  checkoutHost?: string | null; // where the payment happens (tienda.spherewars.com), said before the buyer goes there
};

const noSubscribe = () => () => {};

export function CartView({ locale, settings, canCheckout, addressAtCheckout = false, labels: t, notice, live = null, failedLine = null, checkoutHost = null }: Props) {
  const { items: stored, change, remove } = useCart();
  const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false); // the cart lives in the browser: don't flash "empty" before reading it
  const countries = useMemo(() => shippableCountries(settings), [settings]);
  const [country, setCountry] = useState(countries.includes("ES") ? "ES" : countries[0] ?? "");
  const money = useMemo(() => ({ format: (euros: number) => formatMoney(Math.round(euros * 100), locale, settings.currency) }), [locale, settings.currency]);
  const names = useMemo(() => new Intl.DisplayNames([locale], { type: "region" }), [locale]);

  // Each line against the current catalogue. The browser's copy of price and stock is only display data, and it can be old.
  const lines = useMemo(() => stored.map((i) => {
    const now = live ? live[i.id] : undefined;
    const gone = Boolean(live) && (!now || now.stock === 0);
    const price_cents = now?.price_cents ?? i.price_cents;
    const stock = now ? now.stock : i.stock;
    return { ...i, price_cents, stock, gone, soldOut: now?.stock === 0, oldPrice: now && now.price_cents !== i.price_cents ? i.price_cents : null, short: !gone && stock !== null && i.qty > stock, href: now?.href ?? null };
  }), [stored, live]);
  const buyable = useMemo(() => lines.filter((l) => !l.gone), [lines]);
  const anyGone = lines.some((l) => l.gone);
  const blocked = anyGone || lines.some((l) => l.short);
  const changed = blocked || lines.some((l) => l.oldPrice !== null);

  // Browser-side PREVIEW only. The server recomputes everything from the database before charging.
  const preview = useMemo((): { ok: true; shipping_cents?: number; total_cents?: number } | { ok: false; error: string } => {
    const products = new Map<string, ShopProduct>(buyable.map((i) => [i.id, { id: i.id, name: i.name, sku: null, price_cents: i.price_cents, currency: settings.currency, stock: i.short ? null : i.stock, sellable: true }]));
    const input = buyable.map((i) => ({ id: i.id, qty: i.qty }));
    return addressAtCheckout ? checkLines(input, products) : computeCart(input, products, settings, country);
  }, [buyable, settings, country, addressAtCheckout]);
  const zone = country ? zoneFor(settings, country) : null;
  const subtotal = buyable.reduce((n, i) => n + i.price_cents * i.qty, 0);
  const total = (preview.ok && preview.total_cents) || subtotal;
  const failedName = stored.find((i) => i.id === failedLine)?.name ?? null;
  // WooCommerce settles shipping with the address. Spain is shown as the likely case, from the published rates; the checkout has the last word.
  const spainShip = subtotal >= SHIPPING_INFO.spain.freeOver ? 0 : SHIPPING_INFO.spain.cents;
  const toFree = SHIPPING_INFO.spain.freeOver - subtotal;
  const alert = "border border-ember bg-ember/20 p-3 text-base";
  const small = "text-sm text-stone";

  if (!hydrated) return <div className="min-h-64" aria-hidden />;

  if (stored.length === 0) {
    return (
      <div className="max-w-xl space-y-6">
        {notice && <p role="alert" className={alert}>{notice}</p>}
        <h2 className="font-display text-3xl text-ivory md:text-4xl">{t.cartEmpty}</h2>
        <p className="text-lg text-ivory/85">{t.cartEmptyText}</p>
        <div className="flex flex-wrap gap-3">
          <Link href={`/${locale}/tienda#start-here`} className="btn btn-solid inline-flex min-h-12 items-center bg-gold px-6 py-3 font-display text-base tracking-[0.03em] text-abyss hover:bg-ivory">{t.startHere}</Link>
          <a href={links.rules} rel="noopener" className="btn inline-flex min-h-12 items-center border border-gold/70 px-6 py-3 font-display text-base tracking-[0.03em] text-ivory hover:border-gold hover:bg-gold/15">{t.downloadRules}</a>
        </div>
      </div>
    );
  }

  const step = "btn grid size-11 place-items-center text-gold hover:bg-gold/15 disabled:text-stone/40 disabled:hover:bg-transparent";
  const action = "inline-flex min-h-11 items-center font-display text-base text-gold underline underline-offset-4 hover:text-ivory";

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-12">
      <div>
        {notice && <p role="alert" className={`mb-4 ${alert}`}>{notice}{failedName && <span lang="es" className="mt-1 block font-display text-lg">{failedName}</span>}</p>}
        {changed && !notice && <p role="alert" className={`mb-4 ${alert}`}>{t.priceChanged}</p>}
        {anyGone && (
          <button type="button" onClick={() => lines.filter((l) => l.gone).forEach((l) => remove(l.id))} className={`${action} mb-2`}>{t.removeGone}</button>
        )}
        <ul className="divide-y divide-gold/20 border-y border-gold/20">
          {lines.map((i) => (
            <li key={i.id} className={`grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-4 gap-y-3 py-4 sm:grid-cols-[7rem_minmax(0,1fr)_auto] sm:gap-x-6 ${i.id === failedLine ? "bg-ember/15 outline outline-1 -outline-offset-1 outline-ember px-3" : ""}`}>
              <div className={`spot relative size-[5.5rem] sm:size-28 ${i.gone ? "opacity-50" : ""}`}>
                {i.image && <Image src={i.image} alt="" fill sizes="112px" className="object-contain p-1" />}
              </div>
              <div className="min-w-0">
                {i.href
                  ? <Link href={i.href} lang="es" className="font-display text-xl leading-tight hover:text-gold">{i.name}</Link>
                  : <p lang="es" className="font-display text-xl leading-tight">{i.name}</p>}
                <p className="mt-1 text-base text-stone tabular-nums">{money.format(i.price_cents / 100)}</p>
                {i.id === failedLine && !i.gone && !i.short && <p className="mt-2 text-base text-ivory">{t.lineFailed}</p>}
                {i.gone && <p className="mt-2 text-base text-ivory">{i.soldOut ? `${t.soldOut}.` : t.lineGone} {t.lineRemoveHint}</p>}
                {i.short && i.stock !== null && (
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 text-base text-ivory">
                    {t.lastUnits.replace("{n}", String(i.stock))}
                    <button type="button" onClick={() => cartActions.setQty(i.id, i.stock!, i.stock)} className={action}>{t.lineFix.replace("{n}", String(i.stock))}</button>
                  </p>
                )}
                {i.oldPrice !== null && !i.gone && (
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 text-base text-ivory">
                    {t.linePrice.replace("{old}", money.format(i.oldPrice / 100)).replace("{now}", money.format(i.price_cents / 100))}
                    <button type="button" onClick={() => cartActions.add({ id: i.id, slug: i.slug, name: i.name, image: i.image, price_cents: i.price_cents, stock: i.stock }, 0)} className={action}>{t.lineAck}</button>
                  </p>
                )}
              </div>
              <div className="col-span-2 flex items-center justify-between gap-4 sm:col-span-1 sm:flex-col sm:items-end sm:justify-start">
                {i.gone ? <span /> : (
                  <div className="flex items-center border border-gold/40" role="group" aria-label={`${t.qty}: ${i.name}`}>
                    <button type="button" aria-label={t.qtyLess} onClick={() => change(i.id, -1, i.stock)} disabled={i.qty <= 1} className={step}><Minus size={18} aria-hidden /></button>
                    <span className="min-w-10 text-center text-base tabular-nums" aria-live="polite">{i.qty}</span>
                    <button type="button" aria-label={t.qtyMore} onClick={() => change(i.id, 1, i.stock)} disabled={i.qty >= Math.min(MAX_QTY_PER_LINE, i.stock ?? MAX_QTY_PER_LINE)} className={step}><Plus size={18} aria-hidden /></button>
                  </div>
                )}
                {!i.gone && <p className="font-display text-xl text-gold tabular-nums sm:order-first">{money.format((i.price_cents * i.qty) / 100)}</p>}
                <button type="button" onClick={() => remove(i.id)} aria-label={`${t.remove}: ${i.name}`} className="btn inline-flex min-h-11 items-center gap-2 font-display text-base text-stone hover:text-ivory">
                  <Trash2 size={16} aria-hidden /> {t.remove}
                </button>
              </div>
            </li>
          ))}
        </ul>
        <Link href={`/${locale}/tienda`} className="mt-3 inline-flex min-h-11 items-center font-display text-base text-gold underline-offset-4 hover:underline">{t.continue}</Link>
      </div>

      <aside aria-label={t.total} className="h-fit border border-gold/30 bg-coal p-5 lg:sticky lg:top-20">
        {countries.length === 0 && !addressAtCheckout ? (
          <div className="space-y-4">
            <div className="flex items-baseline justify-between font-display text-2xl text-gold"><span>{t.subtotal}</span><span className="tabular-nums">{money.format(subtotal / 100)}</span></div>
            <p className={small}>{t.taxIncluded}</p>
            <p role="note" className="border-t border-gold/20 pt-4 text-base text-ivory/85">{t.closedCart}</p>
            <a href={links.rules} rel="noopener" className="btn flex min-h-12 items-center justify-center border border-gold/70 px-6 font-display text-base tracking-[0.03em] text-ivory hover:border-gold hover:bg-gold/15">{t.downloadRules}</a>
          </div>
        ) : (
          <form action={startCheckout} className="grid gap-4">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="cart" value={JSON.stringify(stored.map((i) => ({ id: i.id, qty: i.qty })))} />
            {!addressAtCheckout && <label className="grid gap-1.5 font-display text-base">
              {t.shipTo}
              <select name="country" value={country} onChange={(e) => setCountry(e.target.value)} className="min-h-12 border border-gold/40 bg-abyss px-3 font-sans text-base">
                {countries.map((c) => <option key={c} value={c}>{names.of(c) ?? c}</option>)}
              </select>
            </label>}
            {zone?.free_over_cents != null && <p className={small}>{t.freeOver.replace("{amount}", money.format(zone.free_over_cents / 100))}</p>}

            {addressAtCheckout ? (
              <dl className="space-y-2 text-base">
                <div className="flex justify-between gap-4"><dt>{t.subtotal}</dt><dd className="tabular-nums">{money.format(subtotal / 100)}</dd></div>
                <div className="flex justify-between gap-4"><dt>{t.shipSpain}</dt><dd className="tabular-nums">{spainShip === 0 ? t.free : money.format(spainShip / 100)}</dd></div>
                <div className="flex items-baseline justify-between gap-4 border-t border-gold/20 pt-3 font-display text-2xl text-gold"><dt className="text-xl leading-tight">{t.totalSpain}</dt><dd className="tabular-nums">{money.format((subtotal + spainShip) / 100)}</dd></div>
              </dl>
            ) : (
              <dl className="space-y-2 border-t border-gold/20 pt-4 text-base">
                <div className="flex justify-between gap-4"><dt>{t.subtotal}</dt><dd className="tabular-nums">{money.format(subtotal / 100)}</dd></div>
                <div className="flex justify-between gap-4"><dt>{t.shipping}{zone ? ` (${zone.label})` : ""}</dt><dd className="tabular-nums">{preview.ok && preview.shipping_cents !== undefined ? (preview.shipping_cents === 0 ? t.free : money.format(preview.shipping_cents / 100)) : "—"}</dd></div>
                <div className="flex items-baseline justify-between gap-4 border-t border-gold/20 pt-3 font-display text-2xl text-gold"><dt>{t.total}</dt><dd className="tabular-nums">{money.format(total / 100)}</dd></div>
              </dl>
            )}
            <p className={`-mt-2 ${small}`}>{t.taxIncluded}</p>
            {addressAtCheckout && toFree > 0 && <p className="-mt-1 text-base text-ivory">{t.freeShipLeft.replace("{amount}", money.format(toFree / 100))}</p>}
            {addressAtCheckout && <p className={`-mt-1 ${small}`}>{shippingInfoText(t.shipAbroad, locale)} {t.shippingAtCheckout}</p>}

            {!preview.ok && !blocked && <p role="alert" className="text-base text-ivory">{t.errors[preview.error] ?? t.errors.generic}</p>}
            {blocked && <p className="text-base text-ivory">{t.cartBlocked}</p>}

            {canCheckout ? (
              <>
                <CheckoutButton disabled={!preview.ok || blocked} label={t.checkout} />
                {addressAtCheckout && checkoutHost
                  ? <p className="flex gap-2 text-sm text-ivory/85"><Lock size={16} aria-hidden className="mt-0.5 shrink-0 text-gold" /><span>{t.handoff.replace("{host}", checkoutHost)}</span></p>
                  : <p className={small}>{addressAtCheckout ? t.checkoutNoteAddress : t.checkoutNote}</p>}
                <p className={small}>
                  {t.termsPre} <Link href={`/${locale}/legal/condiciones`} className="underline underline-offset-2 hover:text-gold">{t.terms}</Link> · <Link href={`/${locale}/legal/devoluciones`} className="underline underline-offset-2 hover:text-gold">{t.returns}</Link>
                </p>
              </>
            ) : (
              <>
                <p role="note" className="border-t border-gold/20 pt-4 text-base text-ivory/85">{t.closedCart}</p>
                <a href={links.rules} rel="noopener" className="btn flex min-h-12 items-center justify-center border border-gold/70 px-6 font-display text-base tracking-[0.03em] text-ivory hover:border-gold hover:bg-gold/15">{t.downloadRules}</a>
              </>
            )}
          </form>
        )}
      </aside>
    </div>
  );
}
