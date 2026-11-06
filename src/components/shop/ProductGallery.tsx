"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, X, ZoomIn } from "lucide-react";

/** kind: "clean" (cut-out miniature), "bg" (in scene), "size" (with its height marked), "card", "art" (illustration) or "photo". */
export type GalleryPhoto = { src: string; alt: string; art?: boolean; kind?: string };
type Labels = { prev: string; next: string; zoom: string; zoomToggle: string; close: string; photoOf: string; gallery: string; kinds?: Record<string, string> };

const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const kindOf = (p: GalleryPhoto) => p.kind ?? (p.art ? "art" : "photo");

/**
 * Product gallery and the stage of the product page: a cut-out miniature stands on a pool of its faction's light, the other photos sit plainly.
 * Swipeable (native scroll-snap, so touch works without JS), arrows, named thumbnails from tablets up (what each photo shows: scene, size, card...),
 * and a full-screen viewer with zoom. One photo = no controls. Images keep their proportions (object-contain); only the first one loads eagerly.
 * On phones the stage is kept short so the name, price and buy buttons stay on the first screen.
 * WordPress contract: wordpress/theme-src/inc/shop.php parses `<li class="relative aspect-[4/5]`, and sphere.js needs the group > ul > li,
 * `:scope > button` arrows, p[aria-live] and the thumbnails as the group's next sibling <ul>.
 */
export function ProductGallery({ photos, labels }: { photos: GalleryPhoto[]; labels: Labels }) {
  const track = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const many = photos.length > 1;
  const say = (n: number) => labels.photoOf.replace("{n}", String(n + 1)).replace("{total}", String(photos.length));
  const name = (p: GalleryPhoto) => labels.kinds?.[kindOf(p)] ?? null;

  const goTo = useCallback((i: number) => {
    const el = track.current;
    if (!el) return;
    const n = (i + photos.length) % photos.length;
    el.scrollTo({ left: n * el.clientWidth, behavior: calm() ? "auto" : "smooth" });
    setIndex(n);
  }, [photos.length]);

  // keep the index in sync while the visitor swipes
  const onScroll = () => {
    const el = track.current;
    if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  const arrow = "btn absolute top-1/2 grid size-11 -translate-y-1/2 place-items-center border border-gold/30 bg-abyss/70 text-gold hover:bg-gold hover:text-abyss";
  const current = photos[index] ? name(photos[index]) : null;
  return (
    <div>
      <div className="pdp-stage relative" role="group" aria-roledescription="carousel" aria-label={labels.gallery}>
        <ul ref={track} onScroll={onScroll} className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {photos.map((p, i) => {
            const cut = kindOf(p) === "clean";
            return (
              <li key={p.src} className="relative aspect-[4/5] w-full shrink-0 snap-center max-lg:aspect-auto max-lg:h-[36svh] max-lg:min-h-52 lg:aspect-auto lg:h-[min(56svh,36rem)]" aria-label={say(i)}>
                {cut && <span aria-hidden className="pdp-pool" />}
                <button type="button" tabIndex={i === index ? undefined : -1} onClick={(e) => { opener.current = e.currentTarget; setOpen(i); }} aria-label={`${labels.zoom}: ${p.alt}`} className="absolute inset-0 cursor-zoom-in">
                  <Image src={p.src} alt={p.alt} fill sizes={cut ? "(min-width:1024px) 40vw, 80vw" : "(min-width:1024px) 50vw, 100vw"} priority={i === 0} loading={i === 0 ? undefined : "lazy"}
                    className={`object-contain ${cut ? `pdp-cut object-bottom px-[6%] pb-[5%] pt-[3%] ${i === 0 ? "pdp-kindle" : ""}` : p.art ? "p-6 lg:p-10" : "p-2 lg:p-4"}`} />
                </button>
              </li>
            );
          })}
        </ul>
        <span className="pointer-events-none absolute right-2 top-2 border border-gold/30 bg-abyss/70 p-2 text-gold"><Maximize2 size={16} aria-hidden /></span>
        {many && (
          <>
            <button type="button" onClick={() => goTo(index - 1)} aria-label={labels.prev} className={`${arrow} left-2`}><ChevronLeft size={22} aria-hidden /></button>
            <button type="button" onClick={() => goTo(index + 1)} aria-label={labels.next} className={`${arrow} right-2`}><ChevronRight size={22} aria-hidden /></button>
            <p className="absolute bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap bg-abyss/75 px-3 py-0.5 text-sm text-ivory tabular-nums md:hidden" aria-live="polite">{current ? `${current} · ` : ""}{index + 1} / {photos.length}</p>
          </>
        )}
      </div>

      {many && (
        <ul className="mx-auto mt-3 flex w-fit max-w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:thin] max-md:hidden">
          {photos.map((p, i) => (
            <li key={p.src} className="shrink-0">
              <button type="button" onClick={() => goTo(i)} aria-label={say(i)} aria-current={i === index} className="btn pdp-thumb">
                <span className="relative block h-16 w-full"><Image src={p.src} alt="" fill sizes="80px" loading="lazy" className="object-contain" /></span>
                {name(p) && <span aria-hidden>{name(p)}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {open !== null && <Viewer photos={photos} start={open} labels={labels} onClose={(i) => { setOpen(null); goTo(i); opener.current?.focus({ preventScroll: true }); }} />}
    </div>
  );
}

/** Full-screen viewer: arrows, keys or a swipe to move, tap or the button to zoom (scroll to pan), Escape to close. Native modal <dialog> holds the focus. */
function Viewer({ photos, start, labels, onClose }: { photos: GalleryPhoto[]; start: number; labels: Labels; onClose: (i: number) => void }) {
  const [i, setI] = useState(start);
  const [zoom, setZoom] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const touchX = useRef<number | null>(null);
  const many = photos.length > 1;
  const move = useCallback((d: number) => { setZoom(false); setI((v) => (v + d + photos.length) % photos.length); }, [photos.length]);

  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
    closeBtn.current?.focus();
  }, []);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft" && many) move(-1);
    else if (e.key === "ArrowRight" && many) move(1);
  };

  const p = photos[i];
  const kind = labels.kinds?.[kindOf(p)];
  const control = "btn fixed grid size-11 place-items-center bg-abyss/80";
  return (
    <dialog ref={dialog} aria-label={p.alt} className="sw-viewer" onKeyDown={onKey} onClose={() => onClose(i)}>
      <div
        className={`h-full w-full ${zoom ? "overflow-auto" : "grid place-items-center overflow-hidden p-3 sm:p-8"}`}
        onTouchStart={(e) => { touchX.current = zoom || e.touches.length > 1 ? null : e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touchX.current === null || !many) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 48) move(dx < 0 ? 1 : -1);
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.src} alt={p.alt} onClick={() => setZoom((z) => !z)}
          className={`transition-[max-height,max-width] duration-300 ${zoom ? "max-w-none cursor-zoom-out" : "max-h-[88svh] max-w-full cursor-zoom-in object-contain"}`}
          style={zoom ? { width: "min(220vw, 2400px)" } : undefined} />
      </div>
      <button ref={closeBtn} type="button" onClick={() => dialog.current?.close()} aria-label={labels.close} className={`${control} right-3 top-3 text-ivory hover:text-gold`}><X size={26} aria-hidden /></button>
      <button type="button" onClick={() => setZoom((z) => !z)} aria-label={labels.zoomToggle} aria-pressed={zoom} className={`${control} right-16 top-3 text-ivory hover:text-gold`}><ZoomIn size={26} aria-hidden /></button>
      {many && (
        <>
          <button type="button" onClick={() => move(-1)} aria-label={labels.prev} className={`${control} left-3 top-1/2 -translate-y-1/2 text-gold hover:bg-gold hover:text-abyss`}><ChevronLeft size={26} aria-hidden /></button>
          <button type="button" onClick={() => move(1)} aria-label={labels.next} className={`${control} right-3 top-1/2 -translate-y-1/2 text-gold hover:bg-gold hover:text-abyss`}><ChevronRight size={26} aria-hidden /></button>
        </>
      )}
      {(many || kind) && <p className="fixed bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap bg-abyss/80 px-3 py-1 text-sm text-ivory tabular-nums">{kind ? `${kind}${many ? " · " : ""}` : ""}{many ? `${i + 1} / ${photos.length}` : ""}</p>}
    </dialog>
  );
}
