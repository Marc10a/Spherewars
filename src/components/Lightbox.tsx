"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { dict, type Locale } from "@/lib/i18n";

/** Wraps server-rendered article HTML: clicking any image opens it full-size in an accessible dialog. */
export function Lightbox({ children, locale = "es" }: { children: React.ReactNode; locale?: Locale }) {
  const [img, setImg] = useState<{ src: string; alt: string } | null>(null);
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!img) return;
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setImg(null);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [img]);

  return (
    <>
      <div
        onClick={(e) => {
          const t = e.target as HTMLElement;
          if (t.tagName === "IMG") setImg({ src: (t as HTMLImageElement).currentSrc || (t as HTMLImageElement).src, alt: (t as HTMLImageElement).alt });
        }}
        className="[&_img]:cursor-zoom-in"
      >
        {children}
      </div>
      {img && (
        <div role="dialog" aria-modal="true" aria-label={img.alt || dict[locale].a11y.enlarged} onClick={() => setImg(null)} className="fixed inset-0 z-50 grid place-items-center bg-abyss/95 p-4">
          <button ref={close} onClick={() => setImg(null)} aria-label={dict[locale].a11y.close} className="absolute right-4 top-4 text-ivory hover:text-gold"><X size={32} /></button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.src} alt={img.alt} className="max-h-[92vh] max-w-full object-contain" />
        </div>
      )}
    </>
  );
}
