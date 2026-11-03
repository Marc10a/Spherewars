type Kind = "embers" | "snow" | "leaves" | "dust";

// Deterministic pseudo-random so server and client render the same markup.
const rnd = (i: number, salt: number) => { const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453; return x - Math.floor(x); };

/** Ambient CSS-only particles. Purely decorative; disabled by prefers-reduced-motion in globals.css. */
export function Particles({ kind = "dust", count = 22 }: { kind?: Kind; count?: number }) {
  return (
    <div aria-hidden className={`particles particles-${kind} pointer-events-none absolute inset-0 overflow-hidden`}>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          style={{
            left: `${rnd(i, 1) * 100}%`,
            width: `${2 + rnd(i, 2) * (kind === "leaves" ? 7 : 4)}px`,
            height: `${2 + rnd(i, 2) * (kind === "leaves" ? 5 : 4)}px`,
            animationDuration: `${9 + rnd(i, 3) * 14}s`,
            animationDelay: `${-rnd(i, 4) * 20}s`,
            opacity: 0.25 + rnd(i, 5) * 0.6,
          }}
        />
      ))}
    </div>
  );
}

export const particleKind = (theme?: string): Kind =>
  theme === "urueh" ? "embers" : theme === "kurgan" ? "snow" : theme === "malesur" ? "leaves" : "dust";
