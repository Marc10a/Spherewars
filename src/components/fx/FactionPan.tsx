"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { ElementShader } from "@/components/faction/ElementShader";
import type { Element } from "@/lib/element";
import { decorativeVideoAllowed, playWithTouchFallback, videoSrcFor } from "@/lib/video";

export type PanFaction = { slug: string; name: string; theme: string; hook: string; hookLang: string; href: string; element: Element };

/** The four factions at full screen. On wide screens scrolling down travels sideways through them; on phones they stack. Only the visible video plays. */
export function FactionPan({ factions, title, cta }: { factions: PanFaction[]; title: string; cta: string }) {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sec = section.current, tr = track.current;
    if (!sec || !tr) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const videos = [...tr.querySelectorAll<HTMLVideoElement>("video")];
    const playable = decorativeVideoAllowed();
    const visible = new WeakMap<HTMLVideoElement, boolean>();
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      const v = e.target as HTMLVideoElement;
      if (!playable) return;
      visible.set(v, e.isIntersecting);
      if (e.isIntersecting) { if (!v.src) v.src = videoSrcFor(v.dataset.src!); playWithTouchFallback(v, () => visible.get(v) === true); } else v.pause();
    }), { threshold: 0.55 });
    videos.forEach((v) => io.observe(v));
    const wide = window.matchMedia("(min-width: 1024px)");
    let stop = () => {};
    const start = () => {
      stop();
      stop = () => {};
      if (calm || !wide.matches) return;
      let raf = 0, distance = 0;
      const measure = () => { distance = tr.scrollWidth - window.innerWidth; sec.style.height = `${window.innerHeight + distance}px`; };
      const apply = () => {
        raf = 0;
        const p = Math.min(1, Math.max(0, -sec.getBoundingClientRect().top / Math.max(1, sec.offsetHeight - window.innerHeight)));
        tr.style.transform = `translate3d(${-distance * p}px,0,0)`;
        tr.querySelectorAll<HTMLElement>("[data-depth]").forEach((el, i) => {
          const off = i - p * (factions.length - 1);
          el.style.transform = `translate3d(${off * 240}px,0,0)`;
          el.style.opacity = String(Math.max(0, 1 - Math.abs(off) * 1.25));
        });
      };
      const on = () => { if (!raf) raf = requestAnimationFrame(apply); };
      // Keyboard: moving focus to a panel's link scrolls the page until that panel is in view.
      const onFocus = (e: FocusEvent) => {
        const panel = (e.target as HTMLElement).closest("article");
        if (!panel) return;
        const i = [...tr.children].indexOf(panel);
        const y = window.scrollY + sec.getBoundingClientRect().top + (i / Math.max(1, factions.length - 1)) * (sec.offsetHeight - window.innerHeight);
        window.scrollTo({ top: y, behavior: "instant" });
      };
      measure(); apply();
      const ro = new ResizeObserver(() => { measure(); apply(); }); ro.observe(document.documentElement);
      window.addEventListener("scroll", on, { passive: true });
      tr.addEventListener("focusin", onFocus);
      stop = () => {
        cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener("scroll", on); tr.removeEventListener("focusin", onFocus);
        sec.style.height = ""; tr.style.transform = "";
        tr.querySelectorAll<HTMLElement>("[data-depth]").forEach((el) => { el.style.transform = ""; el.style.opacity = ""; });
      };
    };
    start();
    wide.addEventListener("change", start);
    return () => { wide.removeEventListener("change", start); stop(); io.disconnect(); };
  }, [factions.length]);

  return (
    <section ref={section} aria-label={title} className="relative bg-abyss">
      <div className="overflow-hidden lg:sticky lg:top-0 lg:h-svh lg:overflow-clip">
        <h2 className="pointer-events-none absolute left-0 right-0 top-20 z-10 mx-auto max-w-7xl px-4 font-display text-2xl text-gold md:text-3xl">{title}</h2>
        <div ref={track} className="flex flex-col will-change-transform lg:h-full lg:w-max lg:flex-row">
          {factions.map((f) => (
            <article key={f.slug} data-faction={f.theme} className="relative isolate flex min-h-[85svh] w-full items-end overflow-hidden lg:h-full lg:w-screen">
              <Image src={`/facciones/${f.slug}.webp`} alt="" fill sizes="100vw" loading="lazy" className="-z-30 object-cover" />
              <video muted loop playsInline preload="none" data-src={`/facciones/${f.slug}.mp4`} aria-hidden tabIndex={-1} className="absolute inset-0 -z-20 h-full w-full object-cover" />
              <ElementShader element={f.element} />
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-abyss via-abyss/80 via-45% to-transparent to-80% lg:via-abyss/40 lg:via-35% lg:to-70%" aria-hidden />
              <div data-depth className="relative mx-auto w-full max-w-7xl px-4 pb-12 md:pb-16">
                <Image src={`/brand/factions/${f.slug}.webp`} alt="" width={110} height={110} className="sigil-glow h-20 w-auto object-contain md:h-24" />
                <h3 className="land-name mt-3 font-display">{f.name}</h3>
                <p lang={f.hookLang} className="mt-3 max-w-3xl font-display text-2xl text-accent md:text-3xl">{f.hook}</p>
                <Link href={f.href} className="btn btn-solid mt-6 inline-flex min-h-12 items-center bg-accent px-6 font-display text-base text-abyss hover:bg-ivory">{cta}</Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
