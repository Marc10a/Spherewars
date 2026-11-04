"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, type PointerEvent } from "react";

export type RailHero = { name: string; reason: string; img: string; href: string; light?: boolean };

const tilt = (e: PointerEvent<HTMLElement>) => {
  if (e.pointerType !== "mouse") return;
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--rx", `${(0.5 - (e.clientY - r.top) / r.height) * 9}deg`);
  e.currentTarget.style.setProperty("--ry", `${((e.clientX - r.left) / r.width - 0.5) * 11}deg`);
};
const reset = (e: PointerEvent<HTMLElement>) => {
  e.currentTarget.style.setProperty("--rx", "0deg");
  e.currentTarget.style.setProperty("--ry", "0deg");
};

/** Champions gallery: on wide screens vertical scroll moves it sideways; on phones it is a normal swipeable row. */
export function HeroRail({ heroes, title, lead }: { heroes: RailHero[]; title: string; lead: string }) {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const sec = section.current, tr = track.current;
    if (!sec || !tr) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const wide = window.matchMedia("(min-width: 1024px)");
    let stop = () => {};
    const start = () => {
      stop();
      stop = () => {};
      if (!wide.matches) return;
      let raf = 0, distance = 0;
      const measure = () => {
        distance = Math.max(0, tr.scrollWidth - window.innerWidth + 48);
        sec.style.height = `${window.innerHeight + distance}px`;
      };
      const apply = () => {
        raf = 0;
        const top = sec.getBoundingClientRect().top;
        const p = Math.min(1, Math.max(0, -top / Math.max(1, sec.offsetHeight - window.innerHeight)));
        tr.style.transform = `translate3d(${-distance * p}px,0,0)`;
      };
      const onScroll = () => { if (!raf) raf = requestAnimationFrame(apply); };
      // Keyboard: moving focus to a card scrolls the page until that card is in view.
      const onFocus = (e: FocusEvent) => {
        const card = (e.target as HTMLElement).closest("li");
        if (!card) return;
        const p = Math.min(1, Math.max(0, (card.offsetLeft - 48) / Math.max(1, distance)));
        window.scrollTo({ top: window.scrollY + sec.getBoundingClientRect().top + p * (sec.offsetHeight - window.innerHeight), behavior: "instant" });
      };
      measure(); apply();
      const ro = new ResizeObserver(() => { measure(); apply(); }); ro.observe(tr);
      window.addEventListener("scroll", onScroll, { passive: true });
      tr.addEventListener("focusin", onFocus);
      stop = () => {
        cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener("scroll", onScroll); tr.removeEventListener("focusin", onFocus);
        sec.style.height = ""; tr.style.transform = "";
      };
    };
    start();
    wide.addEventListener("change", start);
    return () => { wide.removeEventListener("change", start); stop(); };
  }, []);

  return (
    <section ref={section} aria-labelledby="campeones-t" className="relative">
      <div className="flex flex-col justify-center overflow-hidden py-12 lg:sticky lg:top-16 lg:h-[calc(100svh-4rem)] lg:overflow-clip lg:py-6">
        <div className="mx-auto w-full max-w-7xl px-4">
          <h2 id="campeones-t" className="font-display text-4xl md:text-6xl">{title}</h2>
          <p className="mt-2 max-w-2xl text-lg text-ivory/90">{lead}</p>
        </div>
        <ul ref={track} className="mt-6 flex snap-x gap-5 overflow-x-auto px-4 pb-4 will-change-transform lg:w-max lg:overflow-visible lg:px-[max(1rem,calc((100vw-80rem)/2+1rem))]">
          {heroes.map((h) => (
            <li key={h.name} className="w-72 shrink-0 snap-start lg:w-[23rem]">
              <Link href={h.href} onPointerMove={tilt} onPointerLeave={reset} className="tilt-3d group block">
                <span className={`${h.light ? "bg-ivory" : "spot"} relative block aspect-[4/5] border border-accent/30 transition-colors duration-200 group-hover:border-accent`}>
                  <Image src={h.img} alt={h.name} fill sizes="(min-width:1024px) 368px, 288px" loading="lazy" className={`tilt-3d-mini object-contain p-5 ${h.light ? "mix-blend-multiply" : ""}`} />
                </span>
                <span lang="es" className="mt-3 block font-display text-2xl group-hover:text-accent">{h.name}</span>
                <span lang="es" className="mt-1 block text-ivory/85">{h.reason}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
