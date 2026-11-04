"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { cartActions, type CartItem } from "./cart-store";
import { showConfirmation, type RelatedItem } from "./add-confirm-store";

type Labels = { qty: string; add: string; added: string; buyNow: string; viewCart: string; soldOut: string; qtyLess?: string; qtyMore?: string };
const MAX = 20;
const HEADER = 72; // the sticky site header covers this much of the viewport

/**
 * Quantity + "add to cart" + "buy now" for a product page, plus the phone bar that keeps price and add in reach once they scroll away.
 * WordPress contract (scripts/export-wp-theme.mjs, wordpress/theme-src/assets/sphere.js): the root's exact class and data-sw-item, #qty-label,
 * buttons with aria-label "-" and "+", a first [aria-live], `:scope > .grid > button` (add, then buy) and p[role=status] all have to stay.
 * Screen readers get the real names through aria-labelledby, which wins over those aria-labels.
 */
export function BuyBox({ item, locale, labels, related = [] }: { item: Omit<CartItem, "qty">; locale: string; labels: Labels; related?: RelatedItem[] }) {
  const router = useRouter();
  const max = Math.min(MAX, item.stock ?? MAX);
  const [qty, setQty] = useState(1);
  const [stuck, setStuck] = useState<boolean | null>(null); // null until measured, so the bar is never in the server HTML
  const busy = useRef(false); // ignores repeated clicks while one is being handled
  const cta = useRef<HTMLDivElement>(null);
  const atFooter = useRef(false);
  const ctaGone = useRef(false);

  useEffect(() => {
    const el = cta.current;
    if (!el) return;
    const paint = () => setStuck(ctaGone.current && !atFooter.current);
    const onCta = new IntersectionObserver(([e]) => { ctaGone.current = !e.isIntersecting && e.boundingClientRect.top < HEADER; paint(); }, { rootMargin: `-${HEADER}px 0px 0px 0px` });
    const onFooter = new IntersectionObserver(([e]) => { atFooter.current = e.isIntersecting; paint(); });
    onCta.observe(el);
    const footer = document.querySelector("footer");
    if (footer) onFooter.observe(footer);
    return () => { onCta.disconnect(); onFooter.disconnect(); };
  }, []);

  if (item.stock === 0) return <p className="inline-block border border-stone/40 px-5 py-3 font-display text-base text-stone">{labels.soldOut}</p>;

  const lock = (fn: () => void) => {
    if (busy.current) return;
    busy.current = true;
    try { fn(); } finally { window.setTimeout(() => { busy.current = false; }, 700); }
  };
  const add = (trigger: HTMLElement) => lock(() => {
    cartActions.add(item, qty);
    showConfirmation({ item, qty, related, trigger });
  });
  // Buy now means "this quantity": going back and pressing it again must not pile up.
  const buyNow = () => lock(() => { cartActions.add(item, qty); cartActions.setQty(item.id, qty); router.push(`/${locale}/tienda/carrito`); });
  const step = "btn grid size-11 place-items-center text-gold hover:bg-gold/15 disabled:text-stone/40 disabled:hover:bg-transparent";

  return (
    <>
      <div className="space-y-4" data-sw-item={JSON.stringify(item)}>
        <div className="flex items-center gap-4">
          <span id="qty-label" className="font-display text-base text-stone">{labels.qty}</span>
          <div className="flex items-center border border-gold/40" role="group" aria-labelledby="qty-label">
            <button type="button" aria-label="-" aria-labelledby="qty-less" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} className={step}>
              <span id="qty-less" className="sr-only">{labels.qtyLess ?? `${labels.qty} -`}</span><Minus size={18} aria-hidden />
            </button>
            <span className="min-w-10 text-center text-base tabular-nums" aria-live="polite">{qty}</span>
            <button type="button" aria-label="+" aria-labelledby="qty-more" onClick={() => setQty((q) => Math.min(max, q + 1))} disabled={qty >= max} className={step}>
              <span id="qty-more" className="sr-only">{labels.qtyMore ?? `${labels.qty} +`}</span><Plus size={18} aria-hidden />
            </button>
          </div>
        </div>

        <div ref={cta} className="grid grid-cols-2 gap-3">
          <button type="button" onClick={(e) => add(e.currentTarget)} className="btn btn-solid inline-flex min-h-13 items-center justify-center gap-2 bg-gold px-3 py-2 font-display text-base leading-tight tracking-[0.02em] text-abyss hover:bg-ivory">
            <ShoppingBag size={18} aria-hidden className="shrink-0" /> {labels.add}
          </button>
          <button type="button" onClick={buyNow} className="btn inline-flex min-h-13 items-center justify-center border border-gold/70 px-3 py-2 font-display text-base leading-tight tracking-[0.02em] text-ivory hover:border-gold hover:bg-gold/15">
            {labels.buyNow}
          </button>
        </div>

        <p role="status" className="text-sm text-gold empty:hidden" />
      </div>

      {stuck !== null && (
        <div data-show={stuck} inert={!stuck} className="sw-buybar lg:hidden">
          <p className="font-display text-2xl text-gold tabular-nums">{new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(item.price_cents / 100)}{qty > 1 && <span className="ml-2 text-base text-stone">× {qty}</span>}</p>
          <button type="button" onClick={(e) => add(e.currentTarget)} className="btn btn-solid inline-flex min-h-12 items-center justify-center gap-2 bg-gold px-5 font-display text-base tracking-[0.02em] text-abyss hover:bg-ivory">
            <ShoppingBag size={18} aria-hidden className="shrink-0" /> {labels.add}
          </button>
        </div>
      )}
    </>
  );
}
