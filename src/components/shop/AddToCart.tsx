"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { cartActions, type CartItem } from "./cart-store";

type Props = {
  item: Omit<CartItem, "qty">;
  locale: string;
  labels: { add: string; added: string; soldOut: string; viewCart: string };
};

export function AddToCart({ item, locale, labels }: Props) {
  const [done, setDone] = useState(false);
  if (item.stock === 0) {
    return <p className="inline-block border border-stone/40 px-5 py-3 font-display text-sm text-stone">{labels.soldOut}</p>;
  }
  return (
    <div className="flex flex-wrap items-center gap-4">
      <button
        type="button"
        onClick={() => { cartActions.add(item, 1); setDone(true); window.setTimeout(() => setDone(false), 2500); }}
        className="inline-flex items-center gap-2 bg-gold px-6 py-3 font-display text-sm font-semibold text-abyss transition hover:bg-ivory"
      >
        <ShoppingBag size={16} aria-hidden /> {labels.add}
      </button>
      <span role="status" className="text-sm text-gold">
        {done && (<>{labels.added} · <Link href={`/${locale}/tienda/carrito`} className="underline">{labels.viewCart}</Link></>)}
      </span>
    </div>
  );
}
