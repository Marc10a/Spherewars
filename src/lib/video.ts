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
