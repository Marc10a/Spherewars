"use client";

import { useEffect, useRef } from "react";
import { decorativeVideoAllowed, playWithTouchFallback, videoSrcFor } from "@/lib/video";

/** Decorative looping video that only loads near the screen (the light `-m.mp4` on phones), and never with reduced motion or data saver. */
export function LoopVideo({ src, className }: { src: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v || !decorativeVideoAllowed()) return;
    const wanted = videoSrcFor(src); // phones get the light `-m.mp4` encode
    let inView = false;
    const io = new IntersectionObserver(([e]) => {
      inView = e.isIntersecting;
      if (inView) { if (!v.src) v.src = wanted; playWithTouchFallback(v, () => inView); } else v.pause();
    }, { threshold: 0.2 });
    io.observe(v);
    return () => io.disconnect();
  }, [src]);
  return <video ref={ref} muted loop playsInline preload="none" aria-hidden tabIndex={-1} className={className} />;
}
