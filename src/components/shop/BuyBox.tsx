"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { cartActions, type CartItem } from "./cart-store";

type Labels = { qty: string; add: string; added: string; buyNow: string; viewCart: string; soldOut: string};
const MAX = 20;

/** Quantity + "add to cart" + "buy now" for a product page. Buy now keeps whatever is already in the cart and goes to checkout. */
export function BuyBox({ item, locale, labels }: { item: Omit<CartItem, "qty">; locale: string; labels: Labels }) {
  const router = useRouter();
  const max = Math.min(MAX, item.stock ?? MAX);
  const [qty, setQty] = useState(1);
  const [done, setDone] = useState(false);
  const busy = useRef(false); // ignores repeated clicks while one is being handled
  const timer = useRef<number | undefined>(undefined);

  if (item.stock === 0) return <p className="inline-block border border-stone/40 px-5 py-3 font-display text-sm text-stone">{labels.soldOut}</p>;

  const lock = (fn: () => void) => {
    if (busy.current) return;
    busy.current = true;
    try { fn(); } finally { window.setTimeout(() => { busy.current = false; }, 700); }
  };
  const add = () => lock(() => {
    cartActions.add(item, qty);
    setDone(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setDone(false), 3000);
  });
  const buyNow = () => lock(() => { cartActions.add(item, qty); router.push(`/${locale}/tienda/carrito`); });

  return (
    <div className="space-y-4" data-sw-item={JSON.stringify(item)}>
      <div className="flex items-center gap-4">
        <span id="qty-label" className="font-display text-sm text-stone">{labels.qty}</span>
        <div className="flex items-center border border-gold/40" role="group" aria-labelledby="qty-label">
          <button type="button" aria-label="-" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} className="p-3 disabled:opacity-30"><Minus size={16} /></button>
          <span className="min-w-10 text-center" aria-live="polite">{qty}</span>
          <button type="button" aria-label="+" onClick={() => setQty((q) => Math.min(max, q + 1))} disabled={qty >= max} className="p-3 disabled:opacity-30"><Plus size={16} /></button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={add} className="inline-flex items-center justify-center gap-2 border border-gold px-6 py-4 font-display text-sm font-semibold text-gold transition hover:bg-gold hover:text-abyss">
          <ShoppingBag size={16} aria-hidden /> {labels.add}
        </button>
        <button type="button" onClick={buyNow} className="inline-flex items-center justify-center bg-gold px-6 py-4 font-display text-sm font-semibold text-abyss transition hover:bg-ivory">
          {labels.buyNow}
        </button>
      </div>

      <p role="status" className="min-h-6 text-sm text-gold">
        {done && (<>{labels.added} · <Link href={`/${locale}/tienda/carrito`} className="underline">{labels.viewCart}</Link></>)}
      </p>
    </div>
  );
}
