"use client";

import { playWithTouchFallback } from "@/lib/video";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type FocusEvent, type PointerEvent } from "react";
import { elementFor } from "@/lib/element";
import { ElementShader } from "./ElementShader";

export type ChooserFaction = { slug: string; name: string; theme: string; blurb: string; style: string };
type Connection = EventTarget & { saveData?: boolean };

const SETTLE_MS = 120; // sweeping the cursor across panels must not start every video and shader
const SHADER_OUT_MS = 200;
const VIEW_TRANSITION_WAIT_MS = 1200; // the page is frozen while the browser waits: never wait longer than this

const media = (query: string) => ({
  subscribe: (cb: () => void) => {
    const m = window.matchMedia(query);
    m.addEventListener("change", cb);
    return () => m.removeEventListener("change", cb);
  },
  get: () => window.matchMedia(query).matches,
});
const reducedMotion = media("(prefers-reduced-motion: reduce)");
const stackedLayout = media("(max-width: 767.98px), (hover: none)"); // keep in sync with .fc-* in tailwind.css
const connection = () => (navigator as Navigator & { connection?: Connection }).connection;
const subscribeSaveData = (cb: () => void) => {
  const c = connection();
  c?.addEventListener("change", cb);
  return () => c?.removeEventListener("change", cb);
};
const subscribeVisibility = (cb: () => void) => {
  document.addEventListener("visibilitychange", cb);
  return () => document.removeEventListener("visibilitychange", cb);
};
const getFalse = () => false;
const getTrue = () => true;

/** Video layer over the poster. It stays invisible until it really plays, so a failed video simply leaves the poster. */
function PanelVideo({ slug, live }: { slug: string; live: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (!live) { v.pause(); return; }
    let current = true;
    playWithTouchFallback(v, () => current); // refused until a touch, or interrupted: the poster stays meanwhile
    return () => { current = false; };
  }, [live, failed]);

  if (failed) return null;
  return (
    <video
      ref={ref}
      src={`/facciones/${slug}.mp4`}
      className="fc-media fc-video"
      data-ready={ready || undefined}
      muted
      loop
      playsInline
      disablePictureInPicture
      preload="metadata"
      tabIndex={-1}
      aria-hidden
      onPlaying={() => setReady(true)}
      onError={() => setFailed(true)}
    />
  );
}

/** ElementShader never releases its WebGL context, and browsers cap them, so it is released here on real unmount. */
function PanelShader({ element, leaving }: { element: NonNullable<ReturnType<typeof elementFor>>; leaving: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const canvas = ref.current?.querySelector("canvas");
    return () => {
      // Deferred: Strict Mode re-runs effects on a canvas that is still connected and must keep its context.
      setTimeout(() => {
        if (canvas && !canvas.isConnected) canvas.getContext("webgl2")?.getExtension("WEBGL_lose_context")?.loseContext();
      }, 0);
    };
  }, []);
  return <div ref={ref} className="fc-shader" data-leaving={leaving || undefined}><ElementShader element={element} /></div>;
}

export function FactionChooser({ items, locale, title, lead, cta }: { items: ChooserFaction[]; locale: string; title: string; lead: string; cta: string }) {
  const router = useRouter();
  const section = useRef<HTMLElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const finishTransition = useRef<(() => void) | null>(null);

  const reduced = useSyncExternalStore(reducedMotion.subscribe, reducedMotion.get, getFalse);
  const stacked = useSyncExternalStore(stackedLayout.subscribe, stackedLayout.get, getFalse);
  const saveData = useSyncExternalStore(subscribeSaveData, () => Boolean(connection()?.saveData), getFalse);
  const pageVisible = useSyncExternalStore(subscribeVisibility, () => !document.hidden, getTrue);

  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [inView, setInView] = useState<string | null>(null);
  const [onScreen, setOnScreen] = useState(true);
  const [settled, setSettled] = useState<string | null>(null);
  const [shaderSlug, setShaderSlug] = useState<string | null>(null);
  const [armed, setArmed] = useState<string[]>([]);

  const active = stacked ? inView : hovered ?? focused;
  const rich = !reduced && !saveData;
  const liveSlug = rich && pageVisible && onScreen && settled === active ? active : null;

  // Videos are only requested once their panel has been live; afterwards they stay mounted to resume at once.
  if (liveSlug && !armed.includes(liveSlug)) setArmed([...armed, liveSlug]);

  useEffect(() => {
    const t = setTimeout(() => setSettled(active), active ? SETTLE_MS : 0);
    return () => clearTimeout(t);
  }, [active]);

  // One shader at a time: the old one fades and unmounts before the next one mounts.
  useEffect(() => {
    if (shaderSlug === liveSlug) return;
    const t = setTimeout(() => setShaderSlug(liveSlug), shaderSlug ? SHADER_OUT_MS : 0);
    return () => clearTimeout(t);
  }, [shaderSlug, liveSlug]);

  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // The stack leaves room for the real header height, which belongs to another component.
  useEffect(() => {
    const el = section.current, header = document.querySelector("header");
    if (!el || !header) return;
    const ro = new ResizeObserver(() => el.style.setProperty("--fc-head", `${header.offsetHeight}px`));
    ro.observe(header);
    return () => ro.disconnect();
  }, []);

  // Stacked layout: the panel filling most of the screen is the active one.
  useEffect(() => {
    const ul = list.current;
    if (!stacked || !ul) return;
    const ratios = new Map<Element, number>();
    const headerH = document.querySelector("header")?.offsetHeight ?? 0;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => ratios.set(e.target, e.intersectionRatio));
      let best: Element | null = null, bestRatio = 0.55;
      ratios.forEach((r, target) => { if (r >= bestRatio) { best = target; bestRatio = r; } });
      setInView(best ? (best as HTMLElement).dataset.slug ?? null : null);
    }, { threshold: [0, 0.25, 0.4, 0.55, 0.7, 0.85, 1], rootMargin: `-${headerH}px 0px 0px 0px` });
    Array.from(ul.children).forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, [stacked]);

  // The transition ends when the chooser leaves the DOM, that is, when the new page has been committed.
  useLayoutEffect(() => () => { finishTransition.current?.(); finishTransition.current = null; }, []);

  const navigate = (e: { preventDefault: () => void }, href: string, panel: HTMLElement | null) => {
    if (reduced || !panel || typeof document.startViewTransition !== "function") return; // plain <Link> navigation
    e.preventDefault();
    const root = document.documentElement;
    panel.style.viewTransitionName = "fc-chosen";
    root.classList.add("fc-vt");
    const vt = document.startViewTransition(() => new Promise<void>((resolve) => {
      finishTransition.current = resolve;
      setTimeout(resolve, VIEW_TRANSITION_WAIT_MS);
      router.push(href);
    }));
    vt.finished.catch(() => {}).finally(() => {
      root.classList.remove("fc-vt");
      panel.style.viewTransitionName = "";
    });
  };

  const onFocus = (e: FocusEvent<HTMLAnchorElement>, slug: string) => { if (e.currentTarget.matches(":focus-visible")) setFocused(slug); };
  const onEnter = (e: PointerEvent, slug: string) => { if (e.pointerType === "mouse") setHovered(slug); };

  return (
    <section ref={section} className="fc" aria-labelledby="fc-title">
      <div className="fc-head">
        <h1 id="fc-title" className="fc-title">{title}</h1>
        <p className="fc-lead">{lead}</p>
      </div>
      <ul ref={list} className="fc-list" onPointerLeave={() => setHovered(null)}>
        {items.map((f, i) => {
          const href = `/${locale}/facciones/${f.slug}`;
          const element = elementFor(f.theme);
          const [first, ...rest] = f.name.split(" ");
          const state = active === f.slug ? "active" : active && !stacked ? "dim" : "rest";
          return (
            <li key={f.slug} className="fc-slot" data-slug={f.slug} data-faction={f.theme} data-state={state} style={{ "--i": i } as CSSProperties}>
              <Link
                href={href}
                className="fc-panel"
                aria-labelledby={`fc-name-${f.slug}`}
                aria-describedby={`fc-desc-${f.slug}`}
                onNavigate={(e) => navigate(e, href, document.querySelector<HTMLElement>(`[data-slug="${f.slug}"] .fc-panel`))}
                onPointerEnter={(e) => onEnter(e, f.slug)}
                onFocus={(e) => onFocus(e, f.slug)}
                onBlur={() => setFocused(null)}
              >
                <Image src={`/facciones/${f.slug}.webp`} alt="" fill unoptimized preload={i === 0} sizes="100vw" className="fc-media fc-poster" />
                {rich && armed.includes(f.slug) && <PanelVideo slug={f.slug} live={liveSlug === f.slug} />}
                {shaderSlug === f.slug && element && <PanelShader element={element} leaving={liveSlug !== f.slug} />}
                <span className="fc-dim" aria-hidden />
                <div className="fc-copy">
                  <span className="fc-emblem" aria-hidden>
                    <Image src={`/brand/factions/${f.slug}.webp`} alt="" fill unoptimized sizes="128px" className="object-contain object-left-bottom" />
                  </span>
                  <div className="fc-text">
                    <h2 id={`fc-name-${f.slug}`} className="fc-name">
                      <span>{first}</span> {rest.length > 0 && <span>{rest.join(" ")}</span>}
                    </h2>
                    <span className="fc-details">
                      <span className="fc-details-inner" id={`fc-desc-${f.slug}`}>
                        <span className="fc-blurb">{f.blurb}</span>{" "}
                        <span className="fc-style">{f.style}</span>{" "}
                        <span className="fc-cta">{cta}<ArrowRight aria-hidden size={18} /></span>
                      </span>
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
