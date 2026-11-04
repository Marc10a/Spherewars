"use client";

import Image from "next/image";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * The fog of war over the map of Saphir lifts where the visitor passes (or by itself, so the map is always readable).
 * Without JavaScript or with reduced motion there is simply no fog.
 */
export function FogMap({ src, alt, width, height, children }: { src: string; alt: string; width: number; height: number; children?: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = cv.current, el = box.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !el || !ctx || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let w = 0, h = 0, raf = 0, started = false, done = false, t = 0;
    const paint = () => {
      const r = el.getBoundingClientRect();
      w = r.width; h = r.height; canvas.width = w; canvas.height = h;
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#0d0c10"; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) {
        const x = Math.random() * w, y = Math.random() * h, s = 60 + Math.random() * 190;
        const g = ctx.createRadialGradient(x, y, 0, x, y, s);
        g.addColorStop(0, "rgba(120,126,140,0.13)"); g.addColorStop(1, "rgba(120,126,140,0)");
        ctx.fillStyle = g; ctx.fillRect(x - s, y - s, s * 2, s * 2);
      }
    };
    const brush = (x: number, y: number, s: number) => {
      ctx.globalCompositeOperation = "destination-out";
      const g = ctx.createRadialGradient(x, y, s * 0.15, x, y, s);
      g.addColorStop(0, "rgba(0,0,0,0.95)"); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, s, 0, 6.28); ctx.fill();
    };
    const finish = () => {
      if (done) return; done = true;
      canvas.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1100, easing: "ease-out", fill: "forwards" });
    };
    // The fog thins by itself in soft patches; moving the pointer clears it faster.
    const sweep = () => {
      raf = 0;
      if (done) return;
      t += 1;
      for (let i = 0; i < 2; i++) brush(Math.random() * w, Math.random() * h, Math.max(50, w * 0.1) * (0.5 + Math.random()));
      if (t > 150) { finish(); return; }
      raf = requestAnimationFrame(sweep);
    };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      brush(e.clientX - r.left, e.clientY - r.top, Math.max(70, w * 0.11));
    };
    paint();
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started) { started = true; raf = requestAnimationFrame(sweep); }
    }, { threshold: 0.35 });
    io.observe(el);
    el.addEventListener("pointermove", onMove, { passive: true });
    // Canvas pixels must match the rendered map, which changes once the image loads and on resize.
    const ro = new ResizeObserver(() => { if (!done && Math.round(el.getBoundingClientRect().width) !== Math.round(w)) paint(); });
    ro.observe(el);
    return () => { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); el.removeEventListener("pointermove", onMove); };
  }, []);

  return (
    <div ref={box} className="relative overflow-hidden">
      <Image src={src} alt={alt} width={width} height={height} loading="lazy" className="h-auto w-full" />
      <canvas ref={cv} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />
      {children}
    </div>
  );
}
