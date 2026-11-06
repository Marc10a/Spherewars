"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { muteForAutoplay, playWithTouchFallback } from "@/lib/video";

type Conn = { saveData?: boolean; effectiveType?: string };

/**
 * The faction's video loop, faint, behind a product. The still frame underneath is the fallback and stays for phones:
 * the video only loads on wide screens with a decent connection, never with reduced motion or data saver,
 * pauses off screen and has a pause button (it loops for longer than five seconds).
 */
export function AmbientVideo({ src, pauseLabel, playLabel }: { src: string; pauseLabel: string; playLabel: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<"off" | "playing" | "paused">("off");
  const userPaused = useRef(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const conn = (navigator as Navigator & { connection?: Conn }).connection;
    const wide = window.matchMedia("(min-width: 1024px)").matches;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!wide || calm || conn?.saveData || /(^|-)2g|3g/.test(conn?.effectiveType ?? "")) return;
    muteForAutoplay(video);
    if (video.getAttribute("src") !== src) video.src = src;
    const start = () => { if (!userPaused.current) playWithTouchFallback(video, () => !userPaused.current); };
    video.addEventListener("canplay", start, { once: true });
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) start(); else video.pause(); });
    io.observe(video);
    return () => { io.disconnect(); video.removeEventListener("canplay", start); video.pause(); };
  }, [src]);

  const toggle = () => {
    const video = ref.current;
    if (!video) return;
    userPaused.current = !video.paused;
    if (video.paused) video.play().catch(() => undefined);
    else video.pause();
  };

  return (
    <>
      <video ref={ref} muted loop playsInline preload="none" aria-hidden tabIndex={-1} data-on={state === "playing"} className="pdp-video"
        onPlaying={() => setState("playing")} onPause={() => setState((s) => (s === "off" ? s : "paused"))} />
      {state !== "off" && (
        <button type="button" onClick={toggle} aria-label={state === "playing" ? pauseLabel : playLabel}
          className="btn absolute right-4 top-4 z-10 hidden size-11 items-center justify-center border border-gold/50 bg-abyss/70 text-ivory hover:bg-gold hover:text-abyss lg:inline-flex">
          {state === "playing" ? <Pause size={18} aria-hidden /> : <Play size={18} aria-hidden />}
        </button>
      )}
    </>
  );
}
