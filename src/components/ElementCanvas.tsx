"use client";

import { useEffect, useRef } from "react";
import type { Element } from "@/lib/element";

type P = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; rot: number; spin: number; kind: number };

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/**
 * The element each god gave its people: Kazag's embers, Kurgan's blizzard, Malesur's wind, the Alliance's forge sparks.
 * Decorative. Stops off screen and in hidden tabs, and never runs with reduced motion.
 * mode "hover" only animates while the nearest [data-element-host] is hovered or focused.
 */
export function ElementCanvas({ element, mode = "always", density = 1 }: { element: Element; mode?: "always" | "hover"; density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let w = 0, h = 0, raf = 0, last = 0, visible = true, spawnOn = mode === "always", running = false, burst = 0, gust = 0;
    const ps: P[] = [];
    const size = () => {
      const r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = r.width; h = r.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const target = () => Math.min(element === "wind" ? 70 : 150, ((w * h) / 9000) * density);

    const spawn = (seed = false) => {
      const p: P = { x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 1, rot: rand(0, 6.28), spin: rand(-2, 2), kind: 0 };
      if (element === "fire") {
        Object.assign(p, { x: rand(0, w), y: seed ? rand(0, h) : h + 8, vx: rand(-14, 14), vy: rand(-125, -40), max: rand(2, 5.5), size: rand(0.8, 3.2) });
      } else if (element === "ice") {
        Object.assign(p, { x: rand(-40, w), y: seed ? rand(0, h) : -8, vx: rand(10, 45), vy: rand(30, 95), max: rand(5, 11), size: rand(0.8, 2.4), kind: Math.random() < 0.14 ? 1 : 0 });
        if (p.kind) p.size = rand(4, 8);
      } else if (element === "wind") {
        const leaf = Math.random() < 0.3;
        Object.assign(p, { x: seed ? rand(0, w) : -60, y: rand(0, h), vx: leaf ? rand(90, 190) : rand(240, 480), vy: rand(-12, 12), max: rand(2.5, 6), size: leaf ? rand(3, 6) : rand(50, 150), kind: leaf ? 1 : 0, spin: rand(-5, 5) });
      } else {
        Object.assign(p, { x: rand(0, w), y: rand(h * 0.1, h), vx: rand(-8, 8), vy: rand(-18, -4), max: rand(4, 9), size: rand(0.6, 1.6) }); // drifting forge dust
      }
      ps.push(p);
    };
    const forgeBurst = () => {
      const x = rand(w * 0.3, w), y = rand(h * 0.25, h * 0.85);
      for (let i = 0; i < 26; i++) {
        const a = rand(-Math.PI, 0), s = rand(70, 330);
        ps.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: rand(0.5, 1.3), size: rand(0.8, 2), rot: 0, spin: 0, kind: 1 });
      }
    };

    const draw = (p: P, t: number) => {
      const fade = Math.min(1, (p.max - p.life) / (p.max * 0.35), p.life / 0.2 + 0.1);
      if (element === "fire") {
        const heat = p.life / p.max;
        const c = heat < 0.3 ? "255,214,120" : heat < 0.65 ? "255,132,44" : "214,52,24";
        ctx.fillStyle = `rgba(${c},${0.13 * fade})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 3.4, 0, 6.28); ctx.fill();
        ctx.fillStyle = `rgba(${c},${0.95 * fade})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 6.28); ctx.fill();
      } else if (element === "ice") {
        if (p.kind) {
          ctx.strokeStyle = `rgba(214,238,255,${0.75 * fade})`; ctx.lineWidth = 1;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          for (let k = 0; k < 3; k++) { ctx.rotate(1.047); ctx.beginPath(); ctx.moveTo(-p.size, 0); ctx.lineTo(p.size, 0); ctx.stroke(); }
          ctx.restore();
        } else {
          ctx.fillStyle = `rgba(226,244,255,${0.85 * fade})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 6.28); ctx.fill();
        }
      } else if (element === "wind") {
        if (p.kind) {
          ctx.fillStyle = `rgba(150,214,120,${0.9 * fade})`;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, Math.abs(Math.sin(p.rot * 1.3)) * 0.7 + 0.25);
          ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, 6.28); ctx.fill(); ctx.restore();
        } else {
          const wave = Math.sin(t * 2 + p.y * 0.02) * 14;
          const g = ctx.createLinearGradient(p.x - p.size, 0, p.x, 0);
          g.addColorStop(0, "rgba(214,245,205,0)"); g.addColorStop(1, `rgba(214,245,205,${0.5 * fade})`);
          ctx.strokeStyle = g; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(p.x - p.size, p.y - wave); ctx.quadraticCurveTo(p.x - p.size / 2, p.y + wave, p.x, p.y); ctx.stroke();
        }
      } else if (p.kind) {
        ctx.strokeStyle = `rgba(255,${190 + Math.round(40 * fade)},110,${fade})`; ctx.lineWidth = p.size;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.022, p.y - p.vy * 0.022); ctx.stroke();
      } else {
        ctx.fillStyle = `rgba(232,196,120,${0.55 * fade})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 6.28); ctx.fill();
      }
    };

    const frame = (now: number) => {
      raf = 0;
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      const t = now / 1000;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      if (spawnOn) {
        const n = target();
        for (let i = 0; ps.length < n && i < 4; i++) spawn();
        if (element === "forge") { burst -= dt; if (burst <= 0) { forgeBurst(); burst = rand(0.7, 2.2); } }
        if (element === "ice" || element === "wind") { gust -= dt; if (gust <= -2.5) gust = rand(2, 5); }
      }
      const gustForce = gust > 0 ? 1 : 0;
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.life += dt; p.rot += p.spin * dt;
        if (element === "fire") { p.vx += Math.sin(t * 2 + p.y * 0.015 + i) * 34 * dt; }
        else if (element === "ice") { p.vx += (gustForce * 150 - p.vx * 0.5) * dt + Math.sin(t + i) * 8 * dt; }
        else if (element === "forge" && p.kind) { p.vy += 520 * dt; p.vx *= 1 - 0.8 * dt; }
        else if (element === "wind") { p.vy += Math.sin(t * 1.6 + i) * 22 * dt; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.life > p.max || p.y < -30 || p.y > h + 30 || p.x > w + 180) { ps.splice(i, 1); continue; }
        draw(p, t);
      }
      ctx.globalCompositeOperation = "source-over";
      if (visible && !document.hidden && (spawnOn || ps.length)) raf = requestAnimationFrame(frame);
      else { running = false; if (!ps.length) ctx.clearRect(0, 0, w, h); }
    };
    const start = () => {
      if (running || !visible || document.hidden) return;
      running = true; last = performance.now(); raf = requestAnimationFrame(frame);
    };

    size();
    if (mode === "always") { for (let i = 0, n = target() * 0.7; i < n; i++) spawn(true); }
    const ro = new ResizeObserver(size); ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && (spawnOn || ps.length)) start(); });
    io.observe(canvas);
    const onVis = () => { if (!document.hidden && (spawnOn || ps.length)) start(); };
    document.addEventListener("visibilitychange", onVis);
    const host = mode === "hover" ? canvas.closest<HTMLElement>("[data-element-host]") : null;
    const on = () => { spawnOn = true; start(); };
    const off = () => { spawnOn = false; };
    host?.addEventListener("pointerenter", on); host?.addEventListener("pointerleave", off);
    host?.addEventListener("focusin", on); host?.addEventListener("focusout", off);
    if (mode === "always") start();

    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      host?.removeEventListener("pointerenter", on); host?.removeEventListener("pointerleave", off);
      host?.removeEventListener("focusin", on); host?.removeEventListener("focusout", off);
    };
  }, [element, mode, density]);

  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />;
}
