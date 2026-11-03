"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Scroll reveal for any element with [data-reveal]. Content stays visible without JS and
 * with prefers-reduced-motion: the hidden state only exists while the `js-reveal` class is on <html>.
 * Re-runs on every client-side navigation (the layout persists, so the effect must depend on the path).
 * A failsafe reveals everything after a short delay so content can never stay invisible.
 */
export function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const els = [...document.querySelectorAll<HTMLElement>("[data-reveal]")];
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }),
      { rootMargin: "0px 0px -6% 0px", threshold: 0.01 },
    );
    els.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight) el.classList.add("is-in"); // on screen or above: show immediately
      else io.observe(el);
    });
    root.classList.add("js-reveal");

    // Failsafe: never leave content hidden (slow devices, odd scroll containers, printing).
    const failsafe = window.setTimeout(() => els.forEach((el) => el.classList.add("is-in")), 4000);
    const onPrint = () => els.forEach((el) => el.classList.add("is-in"));
    window.addEventListener("beforeprint", onPrint);

    return () => {
      io.disconnect();
      window.clearTimeout(failsafe);
      window.removeEventListener("beforeprint", onPrint);
    };
  }, [pathname]);

  return null;
}
