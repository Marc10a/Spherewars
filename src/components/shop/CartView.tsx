"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "./cart-store";
import { computeCart, shippableCountries, zoneFor, type ShopProduct, type ShopSettings } from "@/lib/shop/pricing";
import type { Dict } from "@/lib/i18n";
import { startCheckout } from "@/app/[locale]/tienda/actions";

type Props = {
  locale: "es" | "en" | "ca";
  settings: ShopSettings;
  canCheckout: boolean;
  labels: Dict["shop"];
  notice: string | null; // already-localized message coming from the server (?e=...)
};

export function CartView({ locale, settings, canCheckout, labels: t, notice }: Props) {
  const { items, change, remove } = useCart();
  const countries = useMemo(() => shippableCountries(settings), [settings]);
  const [country, setCountry] = useState(countries[0] ?? "");
  const money = useMemo(() => new Intl.NumberFormat(locale, { style: "currency", currency: settings.currency }), [locale, settings.currency]);
  const names = useMemo(() => new Intl.DisplayNames([locale], { type: "region" }), [locale]);

  // Browser-side PREVIEW only. The server recomputes everything from the database before charging.
  const preview = useMemo(() => {
    const products = new Map<string, ShopProduct>(items.map((i) => [i.id, { id: i.id, name: i.name, sku: null, price_cents: i.price_cents, currency: settings.currency, stock: i.stock, sellable: true }]));
    return computeCart(items.map((i) => ({ id: i.id, qty: i.qty })), products, settings, country);
  }, [items, settings, country]);
  const zone = country ? zoneFor(settings, country) : null;
  const subtotal = items.reduce((n, i) => n + i.price_cents * i.qty, 0);

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        {notice && <p role="alert" className="border border-ember bg-ember/20 p-3 text-sm">{notice}</p>}
        <p className="text-stone">{t.cartEmpty}</p>
        <Link href={`/${locale}/tienda`} className="inline-block bg-gold px-6 py-3 font-display text-sm font-semibold text-abyss">{t.continue}</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
      <div>
        {notice && <p role="alert" className="mb-6 border border-ember bg-ember/20 p-3 text-sm">{notice}</p>}
        <ul className="divide-y divide-gold/10 border border-gold/20 bg-coal">
          {items.map((i) => (
            <li key={i.id} className="grid grid-cols-[5rem_1fr] gap-4 p-4 sm:grid-cols-[5rem_1fr_auto]">
              <div className="relative h-20 w-20 bg-abyss">
                {i.image && <Image src={i.image} alt="" fill sizes="80px" className="object-contain" />}
              </div>
              <div>
                <Link href={`/${locale}/miniaturas/${i.slug}`} className="font-display text-lg hover:text-gold">{i.name}</Link>
                <p className="text-sm text-stone">{money.format(i.price_cents / 100)}</p>
                <button type="button" onClick={() => remove(i.id)} className="mt-2 inline-flex items-center gap-1 text-xs uppercase tracking-widest text-stone hover:text-ember">
                  <Trash2 size={14} aria-hidden /> {t.remove}
                </button>
              </div>
              <div className="col-span-2 flex items-center justify-between gap-4 sm:col-span-1 sm:flex-col sm:items-end">
                <div className="flex items-center border border-gold/40" role="group" aria-label={`${t.qty}: ${i.name}`}>
                  <button type="button" aria-label="-" onClick={() => change(i.id, -1)} disabled={i.qty <= 1} className="p-2 disabled:opacity-30"><Minus size={14} /></button>
                  <span className="min-w-8 text-center text-sm" aria-live="polite">{i.qty}</span>
                  <button type="button" aria-label="+" onClick={() => change(i.id, 1)} disabled={i.stock !== null && i.qty >= i.stock} className="p-2 disabled:opacity-30"><Plus size={14} /></button>
                </div>
                <p className="font-display text-gold">{money.format((i.price_cents * i.qty) / 100)}</p>
              </div>
            </li>
          ))}
        </ul>
        <Link href={`/${locale}/tienda`} className="mt-6 inline-block text-xs uppercase tracking-widest text-gold hover:text-ivory">← {t.continue}</Link>
      </div>

      <aside aria-label={t.total} className="h-fit border border-gold/30 bg-coal p-5">
        {countries.length === 0 ? (
          <div className="space-y-3">
            <div className="flex justify-between font-display text-lg text-gold"><span>{t.subtotal}</span><span>{money.format(subtotal / 100)}</span></div>
            <p className="text-xs text-stone">{t.taxIncluded}</p>
            <p role="note" className="border border-dashed border-gold/40 p-3 text-sm text-stone">{t.noShipping}</p>
          </div>
        ) : (
          <form action={startCheckout} className="grid gap-4">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="cart" value={JSON.stringify(items.map((i) => ({ id: i.id, qty: i.qty })))} />
            <label className="grid gap-1 text-sm">
              {t.shipTo}
              <select name="country" value={country} onChange={(e) => setCountry(e.target.value)} className="border border-gold/40 bg-abyss px-3 py-2">
                {countries.map((c) => <option key={c} value={c}>{names.of(c) ?? c}</option>)}
              </select>
            </label>
            {zone?.free_over_cents != null && <p className="text-xs text-stone">{t.freeOver.replace("{amount}", money.format(zone.free_over_cents / 100))}</p>}

            <dl className="space-y-2 border-t border-gold/20 pt-4 text-sm">
              <div className="flex justify-between"><dt>{t.subtotal}</dt><dd>{money.format(subtotal / 100)}</dd></div>
              <div className="flex justify-between"><dt>{t.shipping}{zone ? ` (${zone.label})` : ""}</dt><dd>{preview.ok ? (preview.shipping_cents === 0 ? t.free : money.format(preview.shipping_cents / 100)) : "—"}</dd></div>
              <div className="flex justify-between border-t border-gold/20 pt-2 font-display text-lg text-gold"><dt>{t.total}</dt><dd>{preview.ok ? money.format(preview.total_cents / 100) : money.format(subtotal / 100)}</dd></div>
              <p className="text-xs text-stone">{t.taxIncluded}</p>
            </dl>

            {!preview.ok && <p role="alert" className="text-sm text-ember">{t.errors[preview.error] ?? t.errors.generic}</p>}

            {canCheckout ? (
              <>
                <button disabled={!preview.ok} className="bg-gold px-6 py-3 font-display text-sm font-semibold text-abyss transition hover:bg-ivory disabled:opacity-40">{t.checkout}</button>
                <p className="text-xs text-stone">{t.checkoutNote}</p>
                <p className="text-xs text-stone">
                  {t.termsPre} <Link href={`/${locale}/legal/condiciones`} className="underline">{t.terms}</Link> · <Link href={`/${locale}/legal/devoluciones`} className="underline">{t.returns}</Link>
                </p>
              </>
            ) : (
              <p role="note" className="border border-dashed border-gold/40 p-3 text-sm text-stone">{t.closed}</p>
            )}
          </form>
        )}
      </aside>
    </div>
  );
}
