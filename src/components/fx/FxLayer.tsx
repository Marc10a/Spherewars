"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number };
const ACCENT = "216,168,78";

/**
 * Site-wide effects. A thread of Quinta Esencia follows the pointer and takes the colour of the faction beneath it;
 * clicks throw sparks; each new page opens like a sphere from the point clicked. Pointer effects need a mouse; none run with reduced motion.
 */
export function FxLayer() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const click = useRef({ x: -1, y: -1 });
  const path = usePathname();
  const first = useRef(true);

  // New page: reveal it as a sphere growing from the click.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const main = document.querySelector("main");
    if (!main) return;
    const x = click.current.x >= 0 ? click.current.x : window.innerWidth / 2;
    const y = click.current.y >= 0 ? click.current.y : window.innerHeight / 2;
    const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    main.animate(
      [{ clipPath: `circle(0px at ${x}px ${y}px)`, filter: "brightness(2.2) saturate(1.4)" }, { clipPath: `circle(${r}px at ${x}px ${y}px)`, filter: "brightness(1) saturate(1)" }],
      { duration: 700, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
    );
  }, [path]);

  useEffect(() => {
    const onDown = (e: PointerEvent) => { click.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener("pointerdown", onDown, { passive: true });
    const cv = canvas.current;
    const ctx = cv?.getContext("2d");
    const able = window.matchMedia("(hover: hover) and (pointer: fine)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!cv || !ctx || !able) return () => window.removeEventListener("pointerdown", onDown);

    const N = 26;
    const pts = Array.from({ length: N }, () => ({ x: -100, y: -100 }));
    const sparks: Spark[] = [];
    let mx = -100, my = -100, raf = 0, last = 0, seen = false, colour = ACCENT, idle = 0;
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      cv.width = window.innerWidth * dpr; cv.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const toRgb = (v: string) => {
      const h = v.trim().match(/^#([0-9a-f]{6})$/i)?.[1];
      return h ? `${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)}` : ACCENT;
    };
    const frame = (now: number) => {
      raf = 0;
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.globalCompositeOperation = "lighter";
      let px = mx, py = my, moved = 0;
      pts.forEach((p, i) => {
        const k = i === 0 ? 0.55 : 0.42;
        const dx = (px - p.x) * k, dy = (py - p.y) * k;
        p.x += dx; p.y += dy; moved += Math.abs(dx) + Math.abs(dy);
        px = p.x; py = p.y;
      });
      if (seen) {
        for (let i = 1; i < N; i++) {
          const u = 1 - i / N, wob = Math.sin(now / 130 + i * 0.7) * 1.4 * (1 - u);
          ctx.strokeStyle = `rgba(${colour},${0.75 * u * u})`;
          ctx.lineWidth = 0.6 + 2.6 * u;
          ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(pts[i - 1].x + wob, pts[i - 1].y); ctx.lineTo(pts[i].x + wob, pts[i].y); ctx.stroke();
        }
        const g = ctx.createRadialGradient(pts[0].x, pts[0].y, 0, pts[0].x, pts[0].y, 26);
        g.addColorStop(0, `rgba(${colour},0.5)`); g.addColorStop(1, `rgba(${colour},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(pts[0].x, pts[0].y, 26, 0, 6.28); ctx.fill();
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life += dt; s.vy += 520 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
        if (s.life > s.max) { sparks.splice(i, 1); continue; }
        ctx.strokeStyle = `rgba(${colour},${1 - s.life / s.max})`; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 0.025, s.y - s.vy * 0.025); ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
      idle = moved < 0.4 && !sparks.length ? idle + 1 : 0;
      if (idle < 40 && !document.hidden) raf = requestAnimationFrame(frame);
    };
    const wake = () => { idle = 0; if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      mx = e.clientX; my = e.clientY;
      if (!seen) { seen = true; pts.forEach((p) => { p.x = mx; p.y = my; }); }
      const under = (e.target as Element | null)?.closest?.("[data-faction]");
      colour = under ? toRgb(getComputedStyle(under).getPropertyValue("--accent")) : ACCENT;
      wake();
    };
    const onClick = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      for (let i = 0; i < 16; i++) {
        const a = Math.random() * 6.28, sp = 90 + Math.random() * 300;
        sparks.push({ x: e.clientX, y: e.clientY, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, life: 0, max: 0.35 + Math.random() * 0.5 });
      }
      wake();
    };
    size();
    window.addEventListener("resize", size);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onClick, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointerdown", onDown); window.removeEventListener("resize", size);
      window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerdown", onClick);
    };
  }, []);

  return (
    <>
      <div aria-hidden className="scroll-thread" />
      <canvas ref={canvas} aria-hidden className="pointer-events-none fixed inset-0 z-[60] h-full w-full" />
    </>
  );
}
