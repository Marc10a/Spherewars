"use client";

import { useEffect, useRef } from "react";

/** Decorative looping video that only loads near the screen, and never with reduced motion or data saver. */
export function LoopVideo({ src, className }: { src: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    const saver = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (!v || saver || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { if (!v.src) v.src = src; v.play().catch(() => undefined); } else v.pause();
    }, { threshold: 0.2 });
    io.observe(v);
    return () => io.disconnect();
  }, [src]);
  return <video ref={ref} muted loop playsInline preload="none" aria-hidden tabIndex={-1} className={className} />;
}
