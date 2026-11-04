"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

// Positions over the official Panteón Celestial illustration, as fractions of the image.
const GODS = [
  { name: "Kurgan", x: 0.165, y: 0.3, rgb: [122, 190, 255] },
  { name: "Malesur", x: 0.385, y: 0.27, rgb: [214, 245, 205] },
  { name: "Kazag", x: 0.615, y: 0.3, rgb: [255, 84, 48] },
  { name: "Mohed", x: 0.835, y: 0.32, rgb: [232, 170, 78] },
];
const ORIGIN = { x: 0.5, y: 0.63 }; // top of Saphir
const STRANDS = 6;

/**
 * Lore (WikiSphere, "Bienvenido"): threads of Quinta Esencia rise from a world to the gods, and their colour reveals which people dominates it.
 * Scrolling makes the threads climb from Saphir to the Pantheon; choosing a god changes their colour. Without motion, all threads are simply drawn.
 */
export function EssenceThreads({ title, lead, hint }: { title: string; lead: string; hint: string }) {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState(2);
  const chosen = useRef(false);
  const activeRef = useRef(active);

  const pick = (i: number) => { chosen.current = true; activeRef.current = i; setActive(i); };

  useEffect(() => {
    const cv = canvas.current, st = stage.current, sec = section.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !st || !sec || !ctx) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, raf = 0, visible = true, last = performance.now(), cycle = 0;
    const colour = [...GODS[activeRef.current].rgb];

    const size = () => {
      const r = st.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = r.width; h = r.height; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const progress = () => {
      if (calm) return 1;
      const r = sec.getBoundingClientRect(), span = r.height - window.innerHeight;
      return span <= 0 ? 1 : Math.min(1, Math.max(0, -r.top / (span * 0.8)));
    };
    const point = (ax: number, ay: number, bx: number, by: number, c1x: number, c1y: number, c2x: number, c2y: number, u: number) => {
      const m = 1 - u;
      return [m * m * m * ax + 3 * m * m * u * c1x + 3 * m * u * u * c2x + u * u * u * bx, m * m * m * ay + 3 * m * m * u * c1y + 3 * m * u * u * c2y + u * u * u * by];
    };
    const render = (t: number) => {
      const p = progress();
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      const [cr, cg, cb] = colour;
      const scale = Math.max(0.55, w / 1100);
      const ax = ORIGIN.x * w, ay = ORIGIN.y * h;
      // Glow on Saphir grows as the threads leave it
      const glow = ctx.createRadialGradient(ax, ay, 0, ax, ay, 150 * scale);
      glow.addColorStop(0, `rgba(${cr},${cg},${cb},${0.1 + 0.32 * p})`);
      glow.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(ax, ay, 150 * scale, 0, 6.28); ctx.fill();

      GODS.forEach((god, g) => {
        const bx = god.x * w, by = god.y * h;
        const reach = Math.min(1, Math.max(0, p * 1.35 - g * 0.09));
        if (reach <= 0) return;
        for (let s = 0; s < STRANDS; s++) {
          const phase = g * 1.7 + s * 1.1, o = s - (STRANDS - 1) / 2;
          const wob = Math.sin(t * 0.9 + phase) * 16 * scale;
          const c1x = ax + (bx - ax) * 0.1 + o * 20 * scale + wob, c1y = ay - h * 0.36;
          const c2x = bx + o * 14 * scale - wob * 0.8, c2y = by + h * 0.26 + Math.cos(t * 0.7 + phase) * 12 * scale;
          ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.7)`;
          ctx.lineWidth = (s % 2 ? 1.4 : 2.4) * scale;
          ctx.beginPath(); ctx.moveTo(ax, ay);
          for (let i = 1; i <= 26; i++) {
            const [x, y] = point(ax, ay, bx, by, c1x, c1y, c2x, c2y, (i / 26) * reach);
            ctx.lineTo(x, y);
          }
          ctx.stroke();
          // Essence climbing the thread
          for (let b = 0; b < 2; b++) {
            const u = (((t * (0.14 + s * 0.012) + phase + b * 0.5) % 1) + 1) % 1;
            if (u > reach) continue;
            const [x, y] = point(ax, ay, bx, by, c1x, c1y, c2x, c2y, u);
            ctx.fillStyle = `rgba(${cr},${cg},${cb},0.22)`;
            ctx.beginPath(); ctx.arc(x, y, 6 * scale, 0, 6.28); ctx.fill();
            ctx.fillStyle = "rgba(255,255,255,0.95)";
            ctx.beginPath(); ctx.arc(x, y, 1.7 * scale, 0, 6.28); ctx.fill();
          }
        }
        if (reach >= 1) { // the thread reaches its god
          const halo = ctx.createRadialGradient(bx, by, 0, bx, by, 80 * scale);
          const pulse = 0.2 + 0.1 * Math.sin(t * 2 + g);
          halo.addColorStop(0, `rgba(${cr},${cg},${cb},${pulse})`); halo.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
          ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(bx, by, 80 * scale, 0, 6.28); ctx.fill();
        }
      });
      ctx.globalCompositeOperation = "source-over";
    };
    const frame = (now: number) => {
      raf = 0;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!chosen.current && progress() >= 1) {
        cycle += dt;
        if (cycle > 3.4) { cycle = 0; activeRef.current = (activeRef.current + 1) % GODS.length; setActive(activeRef.current); }
      }
      const target = GODS[activeRef.current].rgb;
      for (let i = 0; i < 3; i++) colour[i] += (target[i] - colour[i]) * Math.min(1, dt * 3.5);
      render(now / 1000);
      if (visible && !document.hidden) raf = requestAnimationFrame(frame);
    };
    const start = () => { if (!raf && visible && !document.hidden && !calm) { last = performance.now(); raf = requestAnimationFrame(frame); } };

    size();
    const ro = new ResizeObserver(() => { size(); if (calm) render(0); }); ro.observe(st);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); }); io.observe(st);
    document.addEventListener("visibilitychange", start);
    if (calm) render(0); else start();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); document.removeEventListener("visibilitychange", start); };
  }, []);

  useEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    window.dispatchEvent(new Event("resize"));
  }, [active]);

  return (
    <section ref={section} aria-labelledby="hebras-t" className="relative h-[210svh] bg-abyss motion-reduce:h-auto">
      <div className="sticky top-[4.25rem] flex h-[calc(100svh-4.25rem)] flex-col items-center justify-center gap-2 overflow-hidden px-4 py-3 motion-reduce:static motion-reduce:h-auto">
        <div className="max-w-3xl text-center">
          <h2 id="hebras-t" className="font-display text-2xl tracking-wide md:text-4xl">{title}</h2>
          <p className="mx-auto mt-2 max-w-3xl text-ivory/90 md:text-lg">{lead}</p>
        </div>
        <div ref={stage} className="relative aspect-[1600/948] max-h-[58svh] w-full max-w-5xl">
          <Image src="/wiki/images/pante_n_celestial.webp" alt="" fill sizes="(min-width:1200px) 1152px, 100vw" loading="lazy" className="object-contain" />
          <canvas ref={canvas} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />
        </div>
        <div role="group" aria-label={hint} className="flex flex-wrap items-center justify-center gap-2">
          {GODS.map((g, i) => (
            <button key={g.name} type="button" aria-pressed={active === i} onClick={() => pick(i)}
              style={active === i ? { borderColor: `rgb(${g.rgb})`, color: `rgb(${g.rgb})` } : undefined}
              className="btn min-h-11 border border-ivory/30 px-4 font-display text-sm font-semibold hover:border-ivory">
              {g.name}
            </button>
          ))}
        </div>
        <p className="text-sm text-stone">{hint}</p>
      </div>
    </section>
  );
}
