/** React only sets `muted` as a property, and not during hydration: phones then refuse to autoplay. State it explicitly. */
export function muteForAutoplay(v: HTMLVideoElement) {
  v.setAttribute("muted", "");
  v.setAttribute("playsinline", "");
  v.defaultMuted = true;
  v.muted = true;
}

/**
 * Plays a decorative video. Phones may refuse (Low Power Mode, for example): in that case it tries again on the visitor's next touch,
 * if `stillWanted` says the video should still play by then. `onRefused` lets the caller offer a play button.
 */
export function playWithTouchFallback(v: HTMLVideoElement, stillWanted: () => boolean = () => true, onRefused?: () => void) {
  muteForAutoplay(v);
  v.play().catch((err: unknown) => {
    if ((err as { name?: string })?.name !== "NotAllowedError") return;
    onRefused?.();
    document.addEventListener("touchend", () => { if (stillWanted()) v.play().catch(() => undefined); }, { once: true, passive: true });
  });
}

/** Phones get the light encode (same name with `-m`, about 960 px wide). Keep in sync with Tailwind's `md` breakpoint. */
export const PHONE_QUERY = "(max-width: 767.98px)";

/** The file to load for this screen: the explicit mobile file, or the `-m.mp4` sibling every decorative loop has. */
export function videoSrcFor(src: string, mobileSrc?: string) {
  return window.matchMedia(PHONE_QUERY).matches ? mobileSrc ?? src.replace(/\.mp4$/, "-m.mp4") : src;
}

/** Decorative video is skipped entirely (the poster stays) with reduced motion or data saver. */
export function decorativeVideoAllowed() {
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return !conn?.saveData && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
