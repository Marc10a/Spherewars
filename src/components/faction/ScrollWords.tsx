"use client";

import { useEffect, useRef } from "react";

/** A quote that lights up word by word as it crosses the screen. Fully visible without motion or JavaScript. */
export function ScrollWords({ text, lang = "es" }: { text: string; lang?: string }) {
  const ref = useRef<HTMLQuoteElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const words = [...el.querySelectorAll<HTMLElement>("span")];
    let raf = 0;
    const apply = () => {
      raf = 0;
      const r = el.getBoundingClientRect(), vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (vh * 0.55 + r.height)));
      words.forEach((w, i) => { w.style.opacity = String(Math.min(1, Math.max(0.16, (p * words.length * 1.25 - i) / 2))); });
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(apply); };
    apply();
    window.addEventListener("scroll", on, { passive: true });
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", on); };
  }, []);

  return (
    <blockquote ref={ref} lang={lang} className="font-display text-3xl leading-snug md:text-6xl">
      {text.split(" ").map((w, i) => <span key={i} className="transition-opacity duration-200">{w} </span>)}
    </blockquote>
  );
}
