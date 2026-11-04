"use client";

import Image from "next/image";
import { LoopVideo } from "@/components/fx/LoopVideo";
import { useEffect, useRef, useState } from "react";

// Positions over the gods video, as fractions of the 16:9 frame.
const GODS = [
  { name: "Kurgan", x: 0.19, y: 0.4, rgb: [122, 190, 255] },
  { name: "Malesur", x: 0.39, y: 0.38, rgb: [214, 245, 205] },
  { name: "Kazag", x: 0.605, y: 0.41, rgb: [255, 84, 48] },
  { name: "Mohed", x: 0.805, y: 0.41, rgb: [232, 170, 78] },
];
const ORIGIN = { x: 0.503, y: 0.575 }; // top of Saphir
const VIDEO_RATIO = 16 / 9;
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
      // Phones get the whole scene at once: only wide screens pin it to the scroll.
      if (calm || !window.matchMedia("(min-width: 1024px)").matches) return 1;
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
      // The video fills the stage like object-fit: cover, so the threads follow the same crop.
      const fw = Math.max(w, h * VIDEO_RATIO), fh = fw / VIDEO_RATIO, ox = (w - fw) / 2, oy = (h - fh) / 2;
      const scale = Math.max(0.55, fw / 1100);
      const ax = ox + ORIGIN.x * fw, ay = oy + ORIGIN.y * fh;
      // Glow on Saphir grows as the threads leave it
      const glow = ctx.createRadialGradient(ax, ay, 0, ax, ay, 150 * scale);
      glow.addColorStop(0, `rgba(${cr},${cg},${cb},${0.1 + 0.32 * p})`);
      glow.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(ax, ay, 150 * scale, 0, 6.28); ctx.fill();

      GODS.forEach((god, g) => {
        const bx = ox + god.x * fw, by = oy + god.y * fh;
        const reach = Math.min(1, Math.max(0, p * 1.35 - g * 0.09));
        if (reach <= 0) return;
        for (let s = 0; s < STRANDS; s++) {
          const phase = g * 1.7 + s * 1.1, o = s - (STRANDS - 1) / 2;
          const wob = Math.sin(t * 0.9 + phase) * 16 * scale;
          // Each thread leaves the planet's rim on its god's side and arcs up to the god.
          const sx = ax + (god.x - ORIGIN.x) * fw * 0.16 + o * 3 * scale, sy = ay + Math.abs(god.x - ORIGIN.x) * fh * 0.1;
          const c1x = sx + (bx - sx) * 0.25 + o * 16 * scale + wob, c1y = sy - fh * 0.2;
          const c2x = bx + o * 12 * scale - wob * 0.8, c2y = by + fh * 0.14 + Math.cos(t * 0.7 + phase) * 10 * scale;
          ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.7)`;
          ctx.lineWidth = (s % 2 ? 1.4 : 2.4) * scale;
          ctx.beginPath(); ctx.moveTo(sx, sy);
          for (let i = 1; i <= 26; i++) {
            const [x, y] = point(sx, sy, bx, by, c1x, c1y, c2x, c2y, (i / 26) * reach);
            ctx.lineTo(x, y);
          }
          ctx.stroke();
          // Essence climbing the thread
          for (let b = 0; b < 2; b++) {
            const u = (((t * (0.14 + s * 0.012) + phase + b * 0.5) % 1) + 1) % 1;
            if (u > reach) continue;
            const [x, y] = point(sx, sy, bx, by, c1x, c1y, c2x, c2y, u);
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
    <section ref={section} aria-labelledby="hebras-t" className="relative bg-abyss motion-reduce:h-auto lg:h-[210svh]">
      <div className="flex flex-col overflow-hidden motion-reduce:static lg:sticky lg:top-[4.25rem] lg:block lg:h-[calc(100svh-4.25rem)]">
        <div className="relative z-10 order-2 px-4 pb-4 pt-10 lg:absolute lg:bottom-8 lg:left-[max(1rem,calc((100vw-90rem)/2+1rem))] lg:w-[30rem] lg:p-0">
          <h2 id="hebras-t" className="font-display text-4xl leading-tight lg:text-5xl">{title}</h2>
          <p className="mt-3 text-lg text-ivory/95">{lead}</p>
        </div>
        <div ref={stage} className="relative order-3 aspect-video w-full bg-abyss lg:absolute lg:inset-0 lg:aspect-auto">
          <Image src="/brand/dioses-loop.webp" alt="" fill sizes="100vw" loading="lazy" className="object-cover" />
          <LoopVideo src="/brand/dioses-loop.mp4" className="absolute inset-0 h-full w-full object-cover" />
          <canvas ref={canvas} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />
          <div className="absolute inset-x-0 bottom-0 hidden h-1/3 bg-gradient-to-t from-abyss/90 to-transparent lg:block" aria-hidden />
          <div className="absolute inset-y-0 left-0 hidden w-[42rem] max-w-[55%] bg-gradient-to-r from-abyss/90 via-abyss/55 to-transparent [mask-image:linear-gradient(to_top,black_55%,transparent_80%)] lg:block" aria-hidden />
        </div>
        <div className="relative z-10 order-4 px-4 pb-10 pt-4 lg:absolute lg:bottom-8 lg:right-[max(1rem,calc((100vw-90rem)/2+1rem))] lg:p-0">
            <div role="group" aria-label={hint} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {GODS.map((g, i) => (
                <button key={g.name} type="button" aria-pressed={active === i} onClick={() => pick(i)}
                  style={active === i ? { borderColor: `rgb(${g.rgb})`, color: `rgb(${g.rgb})` } : undefined}
                  className="btn min-h-11 border border-ivory/40 bg-abyss/70 px-5 font-display text-lg hover:border-ivory">
                  {g.name}
                </button>
              ))}
            </div>
            <p className="mt-2 text-stone lg:text-right">{hint}</p>
        </div>
      </div>
    </section>
  );
}
