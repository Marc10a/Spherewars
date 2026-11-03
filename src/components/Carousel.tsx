"use client";

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Full literal class strings so the Tailwind compiler (scripts/build-css.mjs) can see them.
const SLIDE = {
  one: "basis-full",
  multi: "basis-[82%] sm:basis-[46%] lg:basis-[31.5%]",
  quad: "basis-[82%] sm:basis-[46%] lg:basis-[24%]",
} as const;
// "grid from lg": below lg it is a swipeable carousel, from lg up it is the original grid (no controls needed).
const GRID_LG = "lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible";

type Props = {
  children: ReactNode;
  /** Accessible name of the whole carousel. */
  label: string;
  /** one = a single slide at a time; multi = ~3 per view on desktop; quad = ~4 per view. */
  size?: keyof typeof SLIDE;
  /** Render as the original 4-column grid from `lg` up (carousel only on tablet/mobile). */
  gridFromLg?: boolean;
  labels: { prev: string; next: string; slide: string }; // slide: "{n} / {total}"
  showDots?: boolean;
};

/**
 * Native scroll-snap carousel: touch swipe and trackpad work without JavaScript; the arrows, dots and keyboard are
 * progressive enhancement. No autoplay (accessibility). Smooth scrolling is disabled by prefers-reduced-motion in globals.css.
 */
export function Carousel({ children, label, size = "multi", gridFromLg = false, labels, showDots = false }: Props) {
  const track = useRef<HTMLUListElement>(null);
  const slides = Children.toArray(children);
  const [edge, setEdge] = useState({ start: true, end: false });
  const [index, setIndex] = useState(0);

  const update = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdge({ start: el.scrollLeft <= 4, end: el.scrollLeft >= max - 4 });
    const first = el.children[0] as HTMLElement | undefined;
    const step = first ? first.offsetWidth + parseFloat(getComputedStyle(el).columnGap || "0") : el.clientWidth;
    setIndex(Math.min(slides.length - 1, Math.round(el.scrollLeft / Math.max(step, 1))));
  }, [slides.length]);

  useEffect(() => {
    update();
    const el = track.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [update]);

  const go = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const first = el.children[0] as HTMLElement | undefined;
    const gap = parseFloat(getComputedStyle(el).columnGap || "0");
    const step = first ? first.offsetWidth + gap : el.clientWidth;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  const goTo = (i: number) => {
    const el = track.current;
    const target = el?.children[i] as HTMLElement | undefined;
    if (el && target) el.scrollTo({ left: target.offsetLeft - el.offsetLeft, behavior: "smooth" });
  };

  const btn =
    "absolute top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-gold/60 bg-abyss/85 text-gold backdrop-blur transition hover:bg-gold hover:text-abyss disabled:pointer-events-none disabled:opacity-0";
  const hideOnGrid = gridFromLg ? " lg:hidden" : "";

  return (
    <div role="region" aria-roledescription="carousel" aria-label={label} className="relative">
      <ul
        ref={track}
        onScroll={update}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "ArrowRight") { e.preventDefault(); go(1); } if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); } }}
        className={`flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${gridFromLg ? GRID_LG : ""}`}
      >
        {slides.map((child, i) => (
          <li
            key={i}
            role="group"
            aria-roledescription="slide"
            aria-label={labels.slide.replace("{n}", String(i + 1)).replace("{total}", String(slides.length))}
            className={`min-w-0 shrink-0 snap-start ${gridFromLg ? "lg:basis-auto" : ""} ${SLIDE[size]}`}
          >
            {child}
          </li>
        ))}
      </ul>

      <button type="button" aria-label={labels.prev} onClick={() => go(-1)} disabled={edge.start} className={`${btn} left-1 sm:-left-5${hideOnGrid}`}>
        <ChevronLeft size={22} />
      </button>
      <button type="button" aria-label={labels.next} onClick={() => go(1)} disabled={edge.end} className={`${btn} right-1 sm:-right-5${hideOnGrid}`}>
        <ChevronRight size={22} />
      </button>

      {showDots && slides.length > 1 && (
        <div className={`mt-5 flex justify-center gap-2${hideOnGrid}`}>
          {slides.map((_, i) => (
            <button
              key={i} type="button" aria-label={labels.slide.replace("{n}", String(i + 1)).replace("{total}", String(slides.length))}
              aria-current={i === index ? "true" : undefined} onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all ${i === index ? "w-8 bg-gold" : "w-2 bg-gold/35 hover:bg-gold/60"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
