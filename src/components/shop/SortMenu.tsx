"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowDownUp, Check, ChevronDown } from "lucide-react";

export type SortOption = { href: string; label: string; on: boolean };

/**
 * Sort as a disclosure of plain links: without JavaScript it still opens and every option is a URL (the WordPress export keeps it).
 * With JavaScript it also closes on choosing, on Escape and on a click outside.
 */
export function SortMenu({ label, current, options, active = false }: { label: string; current: string; options: SortOption[]; active?: boolean }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = (focus: boolean) => { const d = ref.current; if (!d) return; d.open = false; if (focus) d.querySelector("summary")?.focus(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(true); };
    const onDown = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) close(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onDown); };
  }, [open]);
  return (
    <details ref={ref} className="shop-sort" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="shop-sort-btn" data-on={active ? "" : undefined}>
        <ArrowDownUp size={18} aria-hidden className="shrink-0 text-gold" />
        <span className="max-sm:sr-only">{label}:</span>
        <span className="text-gold max-sm:sr-only">{current}</span>
        <ChevronDown size={18} aria-hidden className="shop-sort-chev shrink-0 max-sm:hidden" />
      </summary>
      <ul className="shop-sort-menu">
        {options.map((o) => (
          <li key={o.href}>
            <Link href={o.href} scroll={false} prefetch={false} aria-current={o.on ? "true" : undefined} onClick={() => { const d = ref.current; if (!d) return; d.open = false; d.querySelector("summary")?.focus(); }} className="shop-sort-item">
              <Check size={18} aria-hidden className="shrink-0" />
              {o.label}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}
