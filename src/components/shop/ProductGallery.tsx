"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, X, ZoomIn } from "lucide-react";

export type GalleryPhoto = { src: string; alt: string; art?: boolean };
type Labels = { prev: string; next: string; zoom: string; zoomToggle: string; close: string; photoOf: string; gallery: string };

/**
 * Product gallery: swipeable (native scroll-snap, so touch works without JS), arrows, thumbnails, and a full-screen viewer with zoom.
 * One photo = no controls. Images keep their own proportions (object-contain) and only the first one loads eagerly.
 */
export function ProductGallery({ photos, labels }: { photos: GalleryPhoto[]; labels: Labels }) {
  const track = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const many = photos.length > 1;
  const say = (n: number) => labels.photoOf.replace("{n}", String(n + 1)).replace("{total}", String(photos.length));

  const goTo = useCallback((i: number) => {
    const el = track.current;
    if (!el) return;
    const n = (i + photos.length) % photos.length;
    el.scrollTo({ left: n * el.clientWidth, behavior: "smooth" });
    setIndex(n);
  }, [photos.length]);

  // keep the index in sync while the visitor swipes
  const onScroll = () => {
    const el = track.current;
    if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <div>
      <div className="relative border border-accent/30 bg-abyss" role="group" aria-roledescription="carousel" aria-label={labels.gallery}>
        <ul ref={track} onScroll={onScroll} className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {photos.map((p, i) => (
            <li key={p.src} className="relative aspect-[4/5] w-full shrink-0 snap-center" aria-label={say(i)}>
              <button type="button" onClick={() => setOpen(i)} aria-label={`${labels.zoom}: ${p.alt}`} className="absolute inset-0 cursor-zoom-in">
                <Image src={p.src} alt={p.alt} fill sizes="(min-width:1024px) 50vw, 100vw" priority={i === 0} loading={i === 0 ? undefined : "lazy"}
                  className={`object-contain ${p.art ? "bg-ivory mix-blend-multiply" : ""}`} />
              </button>
            </li>
          ))}
        </ul>
        <span className="pointer-events-none absolute right-3 top-3 bg-abyss/70 p-2 text-gold"><Maximize2 size={16} aria-hidden /></span>
        {many && (
          <>
            <button type="button" onClick={() => goTo(index - 1)} aria-label={labels.prev} className="absolute left-2 top-1/2 -translate-y-1/2 bg-abyss/70 p-2 text-gold hover:bg-gold hover:text-abyss"><ChevronLeft size={22} /></button>
            <button type="button" onClick={() => goTo(index + 1)} aria-label={labels.next} className="absolute right-2 top-1/2 -translate-y-1/2 bg-abyss/70 p-2 text-gold hover:bg-gold hover:text-abyss"><ChevronRight size={22} /></button>
            <p className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-abyss/70 px-3 py-1 text-xs tracking-widest text-ivory" aria-live="polite">{index + 1} / {photos.length}</p>
          </>
        )}
      </div>

      {many && (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {photos.map((p, i) => (
            <li key={p.src} className="shrink-0">
              <button type="button" onClick={() => goTo(i)} aria-label={say(i)} aria-current={i === index} className={`relative block h-16 w-14 border bg-abyss transition sm:h-20 sm:w-16 ${i === index ? "border-gold" : "border-gold/20 opacity-70 hover:opacity-100"}`}>
                <Image src={p.src} alt="" fill sizes="64px" loading="lazy" className="object-contain" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {open !== null && <Viewer photos={photos} start={open} labels={labels} onClose={(i) => { setOpen(null); goTo(i); }} />}
    </div>
  );
}

/** Full-screen viewer: arrows/keys to move, click or the button to zoom (scroll to pan), Escape to close. */
function Viewer({ photos, start, labels, onClose }: { photos: GalleryPhoto[]; start: number; labels: Labels; onClose: (i: number) => void }) {
  const [i, setI] = useState(start);
  const [zoom, setZoom] = useState(false);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const many = photos.length > 1;
  const move = useCallback((d: number) => { setZoom(false); setI((v) => (v + d + photos.length) % photos.length); }, [photos.length]);

  useEffect(() => {
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(i);
      else if (e.key === "ArrowLeft" && many) move(-1);
      else if (e.key === "ArrowRight" && many) move(1);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [i, many, move, onClose]);

  const p = photos[i];
  return (
    <div role="dialog" aria-modal="true" aria-label={p.alt} className="fixed inset-0 z-50 bg-abyss/95">
      <div className={`h-full w-full ${zoom ? "overflow-auto" : "grid place-items-center overflow-hidden p-3 sm:p-8"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.src} alt={p.alt} onClick={() => setZoom((z) => !z)}
          className={`transition-[max-height,max-width] duration-300 ${zoom ? "max-w-none cursor-zoom-out" : "max-h-[88vh] max-w-full cursor-zoom-in object-contain"}`}
          style={zoom ? { width: "min(220vw, 2400px)" } : undefined} />
      </div>
      <button ref={closeBtn} type="button" onClick={() => onClose(i)} aria-label={labels.close} className="fixed right-4 top-4 bg-abyss/80 p-2 text-ivory hover:text-gold"><X size={28} /></button>
      <button type="button" onClick={() => setZoom((z) => !z)} aria-label={labels.zoomToggle} className="fixed right-16 top-4 bg-abyss/80 p-2 text-ivory hover:text-gold"><ZoomIn size={28} /></button>
      {many && (
        <>
          <button type="button" onClick={() => move(-1)} aria-label={labels.prev} className="fixed left-3 top-1/2 -translate-y-1/2 bg-abyss/80 p-3 text-gold hover:bg-gold hover:text-abyss"><ChevronLeft size={28} /></button>
          <button type="button" onClick={() => move(1)} aria-label={labels.next} className="fixed right-3 top-1/2 -translate-y-1/2 bg-abyss/80 p-3 text-gold hover:bg-gold hover:text-abyss"><ChevronRight size={28} /></button>
          <p className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-abyss/80 px-3 py-1 text-xs tracking-widest text-ivory">{i + 1} / {photos.length}</p>
        </>
      )}
    </div>
  );
}
