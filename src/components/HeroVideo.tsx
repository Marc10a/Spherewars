"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

/**
 * Home hero background. The poster image underneath stays as the fallback: the video only loads on wide screens,
 * never with reduced motion or data saver, and fades in once it can play.
 */
export function HeroVideo({ src, pauseLabel, playLabel, anyScreen = false, position = "center 22%" }: { src: string; pauseLabel: string; playLabel: string; anyScreen?: boolean; position?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<"off" | "playing" | "paused">("off");
  const userPaused = useRef(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const wide = anyScreen || window.matchMedia("(min-width: 768px)").matches;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!wide || calm || conn?.saveData) return;
    // React sets muted only as a property; mobile browsers check it before allowing autoplay, so state it explicitly.
    video.setAttribute("muted", "");
    video.defaultMuted = true;
    video.muted = true;
    // Assigning the source again would restart the load.
    if (video.getAttribute("src") !== src) video.src = src;
    const start = () => { if (!userPaused.current) video.play().catch(() => undefined); };
    video.addEventListener("canplay", start);
    start();
    // Off screen it stops spending battery; it only resumes if the visitor did not pause it.
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) video.pause();
      else start();
    });
    io.observe(video);
    return () => { io.disconnect(); video.removeEventListener("canplay", start); };
  }, [src, anyScreen]);

  const toggle = () => {
    const video = ref.current;
    if (!video) return;
    userPaused.current = !video.paused;
    if (video.paused) video.play().catch(() => undefined);
    else video.pause();
  };

  return (
    <>
      <video
        ref={ref} muted loop playsInline preload="none" aria-hidden tabIndex={-1}
        onPlaying={() => setState("playing")} onPause={() => setState("paused")}
        style={{ objectPosition: position }}
        className={`absolute inset-0 -z-20 h-full w-full object-cover transition-opacity duration-700 ${anyScreen ? "" : "hidden md:block"} ${state === "off" ? "opacity-0" : "opacity-100"}`}
      />
      {state !== "off" && (
        <button type="button" onClick={toggle} aria-label={state === "playing" ? pauseLabel : playLabel} className={`btn absolute right-4 top-4 z-10 md:bottom-5 md:right-5 md:top-auto h-11 w-11 items-center justify-center border border-gold/70 bg-abyss/70 text-ivory hover:bg-gold hover:text-abyss ${anyScreen ? "inline-flex" : "hidden md:inline-flex"}`}>
          {state === "playing" ? <Pause size={18} aria-hidden /> : <Play size={18} aria-hidden />}
        </button>
      )}
    </>
  );
}
