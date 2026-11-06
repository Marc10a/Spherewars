"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Check, ShoppingBag } from "lucide-react";
import { cartActions, type CartItem } from "./cart-store";

type Labels = { add: string; added: string; viewCart: string; /** Accessible name when `add` is the short form. */ addLong?: string };

/**
 * One tap to the cart, for the Starter Pack comparison and the catalogue tiles. Only rendered when the shop is open and the product has stock.
 * `compact` is the tile button: short label, and the confirmation floats over the tile instead of taking a line under it.
 * WordPress contract (wordpress/theme-src/assets/sphere.js): [data-sw-quick][data-sw-item] with one button and one p[role=status] inside.
 */
export function QuickAdd({ item, locale, labels, compact = false }: { item: Omit<CartItem, "qty">; locale: string; labels: Labels; compact?: boolean }) {
  const [done, setDone] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const busy = useRef(false); // a double-click is one add
  const add = () => {
    if (busy.current) return;
    busy.current = true;
    window.setTimeout(() => { busy.current = false; }, 700);
    cartActions.add(item, 1);
    setDone(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setDone(false), 4000);
  };
  const status = done && <>{labels.added} · <Link href={`/${locale}/tienda/carrito`} className="underline underline-offset-4">{labels.viewCart}</Link></>;
  if (compact) {
    const Icon = done ? Check : ShoppingBag;
    return (
      <div data-sw-item={JSON.stringify(item)} data-sw-quick="" className="qa-compact">
        <button type="button" onClick={add} aria-label={`${labels.addLong ?? labels.add}: ${item.name}`} className="btn btn-solid qa-btn">
          <Icon size={17} aria-hidden className="shrink-0" /> {labels.add}
        </button>
        <p role="status" className="qa-toast">{status}</p>
      </div>
    );
  }
  return (
    <div data-sw-item={JSON.stringify(item)} data-sw-quick="">
      <button type="button" onClick={add} aria-label={`${labels.add}: ${item.name}`} className="btn btn-solid inline-flex min-h-12 w-full items-center justify-center gap-2 bg-gold px-4 py-3 font-display text-base text-abyss hover:bg-ivory">
        <ShoppingBag size={16} aria-hidden /> {labels.add}
      </button>
      <p role="status" className="mt-2 min-h-5 text-sm text-gold">{status}</p>
    </div>
  );
}
