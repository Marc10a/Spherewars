"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "./cart-store";

/** Header cart icon: appears only once something is in the cart. */
export function CartLink({ locale, label }: { locale: string; label: string }) {
  const { count } = useCart();
  if (count === 0) return null;
  return (
    <Link href={`/${locale}/tienda/carrito`} aria-label={`${label} (${count})`} className="relative text-ivory/80 hover:text-gold">
      <ShoppingBag size={20} />
      <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-xs font-bold text-abyss">{count}</span>
    </Link>
  );
}
