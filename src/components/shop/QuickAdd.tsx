"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { cartActions, type CartItem } from "./cart-store";

type Labels = { add: string; added: string; viewCart: string };

/** One tap to the cart, for the Starter Pack comparison. Only rendered when the shop is open and the product has stock. */
export function QuickAdd({ item, locale, labels }: { item: Omit<CartItem, "qty">; locale: string; labels: Labels }) {
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
  return (
    <div data-sw-item={JSON.stringify(item)} data-sw-quick="">
      <button type="button" onClick={add} aria-label={`${labels.add}: ${item.name}`} className="btn btn-solid inline-flex min-h-12 w-full items-center justify-center gap-2 bg-gold px-4 py-3 font-display text-base text-abyss hover:bg-ivory">
        <ShoppingBag size={16} aria-hidden /> {labels.add}
      </button>
      <p role="status" className="mt-2 min-h-5 text-sm text-gold">
        {done && <>{labels.added} · <Link href={`/${locale}/tienda/carrito`} className="underline underline-offset-4">{labels.viewCart}</Link></>}
      </p>
    </div>
  );
}
