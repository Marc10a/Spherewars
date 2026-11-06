"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { decorativeVideoAllowed, muteForAutoplay, playWithTouchFallback, videoSrcFor } from "@/lib/video";

/**
 * Hero background (home and faction landings). The poster image underneath stays as the fallback: phones get the light `-m` encode,
 * nothing loads with reduced motion or data saver, and the video fades in once it can play.
 */
export function HeroVideo({ src, mobileSrc, pauseLabel, playLabel, anyScreen = false, position = "center 22%" }: { src: string; /** Lighter file for phones. The video then fills only the 16:9 band above the text there. */ mobileSrc?: string; pauseLabel: string; playLabel: string; anyScreen?: boolean; position?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<"off" | "refused" | "playing" | "paused">("off");
  const userPaused = useRef(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const shown = anyScreen || Boolean(mobileSrc) || window.matchMedia("(min-width: 768px)").matches;
    if (!shown || !decorativeVideoAllowed()) return;
    muteForAutoplay(video);
    // Phones get the light encode: the explicit mobile file, or the `-m.mp4` sibling.
    const wanted = videoSrcFor(src, mobileSrc);
    const start = () => { if (!userPaused.current) playWithTouchFallback(video, () => !userPaused.current, () => setState("refused")); };
    video.addEventListener("canplay", start, { once: true });
    // The file is only requested once the hero is (nearly) on screen; assigning the source again would restart the load.
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) { video.pause(); return; }
      if (video.getAttribute("src") !== wanted) video.src = wanted;
      start();
    }, { rootMargin: "200px 0px" });
    io.observe(video);
    return () => { io.disconnect(); video.removeEventListener("canplay", start); };
  }, [src, mobileSrc, anyScreen]);

  const toggle = () => {
    const video = ref.current;
    if (!video) return;
    // After a refused autoplay this same touch may already have started it: the button only means "play" here.
    if (state === "refused") { userPaused.current = false; video.play().catch(() => undefined); return; }
    userPaused.current = !video.paused;
    if (video.paused) video.play().catch(() => undefined);
    else video.pause();
  };

  return (
    <>
      <video
        ref={ref} muted loop playsInline preload="none" aria-hidden tabIndex={-1}
        onPlaying={() => setState("playing")} onPause={() => setState((now) => (now === "playing" ? "paused" : now))}
        style={{ objectPosition: position }}
        className={`absolute inset-x-0 top-0 -z-20 w-full object-cover transition-opacity duration-700 ${mobileSrc ? "aspect-video md:inset-y-0 md:aspect-auto md:h-full" : "bottom-0 h-full"} ${anyScreen || mobileSrc ? "" : "hidden md:block"} ${state === "off" || state === "refused" ? "opacity-0" : "opacity-100"}`}
      />
      {state !== "off" && (
        <button type="button" onClick={toggle} aria-label={state === "playing" ? pauseLabel : playLabel} className={`btn absolute right-4 top-4 z-10 md:bottom-5 md:right-5 md:top-auto h-11 w-11 items-center justify-center border border-gold/70 bg-abyss/70 text-ivory hover:bg-gold hover:text-abyss ${anyScreen || mobileSrc ? "inline-flex" : "hidden md:inline-flex"}`}>
          {state === "playing" ? <Pause size={18} aria-hidden /> : <Play size={18} aria-hidden />}
        </button>
      )}
    </>
  );
}
