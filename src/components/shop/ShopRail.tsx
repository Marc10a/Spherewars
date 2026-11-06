"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** The faction cards: a grid on wide screens, a swipeable row on phones that opens with the current faction in view. */
export function ShopRail({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const rail = ref.current;
    const on = rail?.querySelector<HTMLElement>('[aria-current="page"]')?.closest("li");
    if (!rail || !on || rail.scrollWidth <= rail.clientWidth) return;
    rail.scrollLeft = on.offsetLeft - (rail.clientWidth - on.offsetWidth) / 2;
  }, []);
  return <ul ref={ref} className={className}>{children}</ul>;
}
