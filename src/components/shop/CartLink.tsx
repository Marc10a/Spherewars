"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "./cart-store";

/** Header cart icon: always there, so the cart can be found before anything is in it. The count shows once there is one. */
export function CartLink({ locale, label }: { locale: string; label: string }) {
  const { count } = useCart();
  return (
    <Link href={`/${locale}/tienda/carrito`} aria-label={count ? `${label} (${count})` : label} className="relative grid size-11 shrink-0 place-items-center text-ivory/80 hover:text-gold">
      <ShoppingBag size={20} aria-hidden />
      {count > 0 && <span key={count} className="sw-pop absolute right-0 top-0 grid h-5 min-w-5 place-items-center bg-gold px-1 text-sm leading-none text-abyss tabular-nums">{count}</span>}
    </Link>
  );
}
