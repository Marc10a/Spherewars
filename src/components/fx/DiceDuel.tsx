"use client";

import { useRef, useState } from "react";

const FACE_ROT: Record<number, [number, number]> = { 1: [0, 0], 2: [0, -90], 3: [-90, 0], 4: [90, 0], 5: [0, 90], 6: [0, 180] };
const FACES = [
  { n: 1, t: "translateZ(var(--half))" }, { n: 6, t: "rotateY(180deg) translateZ(var(--half))" },
  { n: 2, t: "rotateY(90deg) translateZ(var(--half))" }, { n: 5, t: "rotateY(-90deg) translateZ(var(--half))" },
  { n: 3, t: "rotateX(90deg) translateZ(var(--half))" }, { n: 4, t: "rotateX(-90deg) translateZ(var(--half))" },
];
const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]], 2: [[28, 28], [72, 72]], 3: [[26, 26], [50, 50], [74, 74]], 4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[26, 26], [74, 26], [50, 50], [26, 74], [74, 74]], 6: [[28, 24], [72, 24], [28, 50], [72, 50], [28, 76], [72, 76]],
};

type Labels = { title: string; lead: string; you: string; rival: string; roll: string; rollAgain: string; win: string; lose: string; tie: string; discarded: string };
type Roll = { values: number[]; turns: number };

const d6 = () => 1 + Math.floor(Math.random() * 6);
/** Rule from the Quick Guide: 1s are discarded, highest value wins and, on a tie, the next highest decides. */
function decide(a: number[], b: number[]) {
  const clean = (v: number[]) => v.filter((x) => x !== 1).sort((x, y) => y - x);
  const x = clean(a), y = clean(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const p = x[i] ?? 0, q = y[i] ?? 0;
    if (p !== q) return p > q ? 1 : -1;
  }
  return 0;
}

function Die({ value, turns, delay, off, won }: { value: number; turns: number; delay: number; off: boolean; won: boolean }) {
  const [rx, ry] = FACE_ROT[value];
  return (
    <div className={`die-scene transition-opacity duration-300 ${off ? "opacity-35" : ""}`} aria-hidden>
      <div className={`die ${won ? "die-won" : ""}`} style={{ transform: `rotateX(${rx + turns * 360}deg) rotateY(${ry + turns * 720}deg)`, transitionDelay: `${delay}ms` }}>
        {FACES.map((f) => (
          <div key={f.n} className="die-face" style={{ transform: f.t }}>
            {PIPS[f.n].map(([x, y]) => <span key={`${x}-${y}`} className="die-pip" style={{ left: `${x}%`, top: `${y}%` }} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Playable opposed roll: teaches the core rule of the game by rolling it. */
export function DiceDuel({ labels }: { labels: Labels }) {
  const [you, setYou] = useState<Roll>({ values: [6, 4, 2], turns: 0 });
  const [rival, setRival] = useState<Roll>({ values: [5, 3, 1], turns: 0 });
  const [state, setState] = useState<"idle" | "rolling" | "done">("idle");
  const timer = useRef<number | undefined>(undefined);
  const result = decide(you.values, rival.values);
  const roll = () => {
    if (state === "rolling") return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setYou((r) => ({ values: [d6(), d6(), d6()], turns: r.turns + 2 }));
    setRival((r) => ({ values: [d6(), d6(), d6()], turns: r.turns + 2 }));
    setState("rolling");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("done"), calm ? 0 : 1500);
  };
  const shown = state === "done";
  const message = result > 0 ? labels.win : result < 0 ? labels.lose : labels.tie;

  return (
    <section aria-labelledby="duelo-t" className="relative overflow-hidden border-y border-gold/25 bg-coal">
      <div className="mx-auto max-w-7xl px-4 py-16">
        <h2 id="duelo-t" className="font-display text-4xl md:text-5xl">{labels.title}</h2>
        <p className="mt-3 max-w-2xl text-lg text-ivory/90">{labels.lead}</p>
        <div className="mt-10 grid items-center gap-8 md:grid-cols-[1fr_auto_1fr]">
          {[{ who: labels.you, r: you, side: 1 }, { who: labels.rival, r: rival, side: -1 }].map(({ who, r, side }, idx) => (
            <div key={who} className={idx ? "md:order-3" : "md:order-1"}>
              <p className={`font-display text-2xl ${shown && result === side ? "text-gold" : ""}`}>{who}</p>
              <div className="mt-4 flex gap-4">
                {r.values.map((v, i) => <Die key={i} value={v} turns={r.turns} delay={i * 90} off={shown && v === 1} won={shown && result === side} />)}
              </div>
              <p className="sr-only">{r.values.join(", ")}</p>
            </div>
          ))}
          <div className="text-center md:order-2">
            <button type="button" onClick={roll} disabled={state === "rolling"} className="btn min-h-14 bg-gold px-8 font-display text-lg text-abyss hover:bg-ivory disabled:opacity-60">
              {state === "idle" ? labels.roll : labels.rollAgain}
            </button>
          </div>
        </div>
        <p role="status" className="mt-8 min-h-9 font-display text-2xl text-gold">{shown ? message : ""}</p>
        <p className="mt-1 min-h-6 text-stone">{shown && [...you.values, ...rival.values].includes(1) ? labels.discarded : ""}</p>
      </div>
    </section>
  );
}
