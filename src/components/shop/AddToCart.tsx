"use client";

import { useRef } from "react";
import { ShoppingBag } from "lucide-react";
import { cartActions, type CartItem } from "./cart-store";
import { showConfirmation } from "./add-confirm-store";

type Props = {
  item: Omit<CartItem, "qty">;
  locale: string;
  labels: { add: string; added: string; soldOut: string; viewCart: string };
};

/** One-tap add; the confirmation (mounted by the header) takes it from there. */
export function AddToCart({ item, labels }: Props) {
  const busy = useRef(false); // a double-click is one add
  if (item.stock === 0) {
    return <p className="inline-block border border-stone/40 px-5 py-3 font-display text-base text-stone">{labels.soldOut}</p>;
  }
  return (
    <button
      type="button"
      onClick={(e) => {
        if (busy.current) return;
        busy.current = true;
        window.setTimeout(() => { busy.current = false; }, 700);
        cartActions.add(item, 1); showConfirmation({ item, qty: 1, related: [], trigger: e.currentTarget });
      }}
      className="btn btn-solid inline-flex min-h-12 items-center gap-2 bg-gold px-6 py-3 font-display text-base tracking-[0.03em] text-abyss hover:bg-ivory"
    >
      <ShoppingBag size={18} aria-hidden /> {labels.add}
    </button>
  );
}
