"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { X } from "lucide-react";
import { useCart } from "./cart-store";
import { hideConfirmation, useConfirmation } from "./add-confirm-store";

export type AddConfirmLabels = { added: string; close: string; subtotal: string; viewCart: string; continue: string; crossTitle: string };

/** What just went into the cart: side drawer on desktop, bottom sheet on phones. A native modal <dialog> traps focus and closes with Escape. */
export function AddConfirm({ locale, labels }: { locale: string; labels: AddConfirmLabels }) {
  const c = useConfirmation();
  const { items } = useCart();
  const dialog = useRef<HTMLDialogElement>(null);
  const primary = useRef<HTMLAnchorElement>(null);
  const open = c?.open ?? false;
  const money = useMemo(() => new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }), [locale]);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) { d.showModal(); primary.current?.focus(); }
    if (!open && d.open) d.close();
  }, [open]);

  if (!c) return null;
  const subtotal = items.reduce((n, i) => n + i.price_cents * i.qty, 0);
  const count = items.reduce((n, i) => n + i.qty, 0);
  const inCart = new Set(items.map((i) => i.id));
  const related = c.related.filter((r) => !inCart.has(r.id)).slice(0, 2);

  return (
    <dialog
      ref={dialog} aria-labelledby="add-confirm-title" className="sw-sheet"
      onClose={() => { hideConfirmation(); c.trigger?.focus({ preventScroll: true }); }}
      onClick={(e) => { if (e.target === e.currentTarget) hideConfirmation(); }}
    >
      <div className="flex min-h-full flex-col gap-4 p-4 md:gap-6 md:p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 id="add-confirm-title" className="font-display text-2xl text-gold">{labels.added}</h2>
          <button type="button" onClick={hideConfirmation} aria-label={labels.close} className="btn -mr-2 grid size-11 shrink-0 place-items-center text-ivory hover:text-gold"><X size={24} aria-hidden /></button>
        </div>

        <div className="grid grid-cols-[4.5rem_1fr] items-center gap-4">
          <div className="spot relative size-[4.5rem]">
            {c.item.image && <Image src={c.item.image} alt="" fill sizes="72px" className="object-contain p-1" />}
          </div>
          <div>
            <p lang="es" className="font-display text-lg leading-snug">{c.item.name}</p>
            <p className="mt-1 text-sm text-stone tabular-nums">{c.qty} × {money.format(c.item.price_cents / 100)}</p>
          </div>
        </div>

        <p className="flex items-baseline justify-between gap-4 border-t border-gold/25 pt-4">
          <span className="text-base text-stone">{labels.subtotal} ({count})</span>
          <span className="font-display text-2xl text-gold tabular-nums">{money.format(subtotal / 100)}</span>
        </p>

        <div className="grid gap-3">
          <Link ref={primary} href={`/${locale}/tienda/carrito`} onClick={hideConfirmation} className="btn btn-solid flex min-h-12 items-center justify-center bg-gold px-6 font-display text-base tracking-[0.03em] text-abyss hover:bg-ivory">{labels.viewCart}</Link>
          <button type="button" onClick={hideConfirmation} className="btn min-h-12 border border-gold/70 px-6 font-display text-base tracking-[0.03em] text-ivory hover:border-gold hover:bg-gold/15">{labels.continue}</button>
        </div>

        {related.length > 0 && (
          <section aria-labelledby="add-confirm-more" className="border-t border-gold/25 pt-5 md:mt-auto">
            <h3 id="add-confirm-more" className="font-display text-lg">{labels.crossTitle}</h3>
            <ul className="mt-3 grid grid-cols-2 gap-3">
              {related.map((r) => (
                <li key={r.id}>
                  <Link href={r.href} onClick={hideConfirmation} className="group block">
                    <span className="spot relative block h-28 md:h-auto md:aspect-square">
                      {r.image && <Image src={r.image} alt="" fill sizes="(min-width:768px) 180px, 45vw" loading="lazy" className="object-contain p-2" />}
                    </span>
                    <span lang="es" className="mt-2 block font-display text-base leading-tight group-hover:text-gold">{r.name}</span>
                    <span className="mt-0.5 block text-sm text-stone tabular-nums">{r.price}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </dialog>
  );
}
