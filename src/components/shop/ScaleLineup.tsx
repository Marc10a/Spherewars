import Image from "next/image";
import Link from "next/link";

/**
 * One miniature at its official height. `size` is the cut-out's [width, height, left, top, right, bottom] in pixels:
 * the box its opaque pixels fill is what gets drawn at the official height, so transparent margins do not shrink it.
 */
export type Figure = { key: string; name: string; heightMm: number; heightText: string; src: string; size: [number, number, number, number, number, number]; href?: string; current?: boolean };

/** "3,9 cm" -> 39, "36 mm" -> 36. Null when the official text is not a plain measure. */
export function toMm(text: string | null | undefined): number | null {
  const m = text?.trim().match(/^(\d+(?:[.,]\d+)?)\s*(mm|cm)$/i);
  if (!m) return null;
  const n = Number(m[1].replace(",", "."));
  return m[2].toLowerCase() === "cm" ? n * 10 : n;
}

/** Drawn width in millimetres: the opaque box's proportions at the official height. */
const widthMm = (f: Figure) => {
  const [, , x0, y0, x1, y1] = f.size;
  return f.heightMm * ((x1 - x0) / (y1 - y0));
};

/** The whole cut-out photo, placed so that its opaque box fills the figure's box exactly. */
function FigureImage({ f, sizes }: { f: Figure; sizes: string }) {
  const [iw, ih, x0, y0, x1, y1] = f.size;
  const bw = x1 - x0, bh = y1 - y0;
  const crop = { left: `${(-x0 / bw) * 100}%`, top: `${(-y0 / bh) * 100}%`, width: `${(iw / bw) * 100}%`, height: `${(ih / bh) * 100}%` };
  return <span className="absolute block" style={crop}><Image src={f.src} alt="" fill sizes={sizes} loading="lazy" /></span>;
}

/**
 * Comparison to scale: each cut-out drawn at its official height (Altura) on the same scale, with a line every centimetre.
 * Everything is placed in millimetres and turned into percentages, so the scale holds at any width. Nothing is estimated:
 * a figure without an official height or a cut-out photo is simply left out by the caller.
 * Names sit in columns under the figures from 640 px; on phones they become a plain list.
 */
export function ScaleLineup({ figures, label, maxHeightRem = 22 }: { figures: Figure[]; label: string; maxHeightRem?: number }) {
  const tallest = Math.max(...figures.map((f) => f.heightMm));
  const gap = tallest * 0.12;
  const minCol = tallest * 0.5; // room for the name under narrow figures
  const cols = figures.map((f) => {
    const w = widthMm(f);
    return { f, w, col: Math.max(w, minCol) };
  });
  const placed = cols.map((c, i) => ({ ...c, x: cols.slice(0, i).reduce((n, p) => n + p.col + gap, 0) }));
  const total = cols.reduce((n, c) => n + c.col, 0) + gap * (cols.length - 1);
  const pct = (v: number) => `${(v / total) * 100}%`;
  const name = (f: Figure, cls: string) => f.href && !f.current
    ? <Link href={f.href} lang="es" className={`${cls} text-stone underline-offset-4 hover:text-accent hover:underline`}>{f.name}</Link>
    : <span lang="es" className={`${cls} text-accent`}>{f.name}</span>;

  return (
    <figure className="mx-auto w-full" style={{ maxWidth: `${(maxHeightRem * total) / tallest}rem` }}>
      <div role="img" aria-label={label} className="pdp-scale" style={{ aspectRatio: `${total} / ${tallest}`, ["--cm" as string]: `${(10 / tallest) * 100}%` }}>
        {placed.map(({ f, w, col, x: left }) => {
          const style = { left: pct(left + (col - w) / 2), width: pct(w), height: `${(f.heightMm / tallest) * 100}%` };
          const img = <FigureImage f={f} sizes="(min-width:1024px) 14rem, 30vw" />;
          return f.href && !f.current
            ? <Link key={f.key} href={f.href} tabIndex={-1} aria-hidden className="pdp-fig" style={style}>{img}</Link>
            : <span key={f.key} className="pdp-fig" style={style} aria-current={f.current ? "true" : undefined}>{img}</span>;
        })}
      </div>
      <figcaption className="mt-2">
        <ul className="grid max-sm:hidden" style={{ gridTemplateColumns: placed.map((p) => pct(p.col)).join(" "), columnGap: pct(gap) }}>
          {placed.map(({ f }) => (
            <li key={f.key} className="min-w-0 text-center leading-tight [overflow-wrap:anywhere]">
              {name(f, "inline-flex min-h-11 items-center justify-center text-sm")}
              <span className="block font-display text-base text-ivory tabular-nums">{f.heightText}</span>
            </li>
          ))}
        </ul>
        <ul className="divide-y divide-gold/15 border-b border-gold/15 sm:hidden">
          {[...placed].reverse().map(({ f }) => (
            <li key={f.key} className="flex min-h-11 items-center justify-between gap-4">
              {name(f, "flex min-h-11 items-center text-base")}
              <span className="font-display text-lg text-ivory tabular-nums">{f.heightText}</span>
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}

/**
 * Height of the reference (`refMm`) in rem at each width, matching `--scale-h` on `.scale-wall` in tailwind.css: phones, from 640 px, from 1024 px.
 * Used only to tell the browser which image size to fetch.
 */
const WALL_REM = [11.5, 14, 17] as const;

export type WallFigure = Figure & { id: string; theme?: string };

/**
 * Many miniatures at one fixed scale: `refMm` (the tallest in the whole shop) is always `--scale-h` high, so every row, group and filter
 * shares the same millimetres per pixel. Each column carries its own stretch of the 1 cm grid; columns sit edge to edge, so the lines and
 * the ground run unbroken along a row. Rows wrap on wide screens and become one swipeable lane on phones.
 * The drawing is decorative for assistive technology: the list itself (name and official height, linked to the product) is the text.
 */
export function ScaleWall({ figures, refMm, label }: { figures: WallFigure[]; refMm: number; label: string }) {
  const gap = refMm * 0.07;
  const minCol = refMm * 0.42; // room for the name under narrow figures
  return (
    <ul aria-label={label} className="scale-wall" style={{ ["--cm" as string]: `${(10 / refMm) * 100}%` }}>
      {figures.map((f) => {
        const w = widthMm(f);
        const col = Math.max(w, minCol) + gap;
        const [iw, , x0, , x1] = f.size;
        const img = (rem: number) => `${Math.ceil(rem * 16 * (w / refMm) * (iw / (x1 - x0)))}px`; // the whole photo, wider than its opaque box
        const sizes = `(min-width:1024px) ${img(WALL_REM[2])}, (min-width:640px) ${img(WALL_REM[1])}, ${img(WALL_REM[0])}`;
        return (
          <li key={f.key} id={f.id} data-faction={f.theme} className="scale-col" style={{ ["--col" as string]: col / refMm }}>
            <div className="pdp-scale scale-col-draw" aria-hidden>
              <Link href={f.href ?? "#"} tabIndex={-1} className="pdp-fig" style={{ left: `${((col - w) / 2 / col) * 100}%`, width: `${(w / col) * 100}%`, height: `${(f.heightMm / refMm) * 100}%` }}>
                <FigureImage f={f} sizes={sizes} />
              </Link>
            </div>
            <p className="scale-col-label">
              {f.href ? <Link href={f.href} lang="es" className="scale-col-name">{f.name}</Link> : <span lang="es" className="scale-col-name">{f.name}</span>}
              <span className="block font-display text-base text-ivory tabular-nums">{f.heightText}</span>
            </p>
          </li>
        );
      })}
    </ul>
  );
}

/** A small silhouette that keeps the scale: the box is `refMm` high and the figure stands in it at its official height. */
export function ScaleThumb({ f, refMm }: { f: Figure; refMm: number }) {
  const w = widthMm(f);
  const box = Math.max(refMm, w); // the widest figures still fit the box, at the same scale
  return (
    <span className="scale-thumb" aria-hidden style={{ aspectRatio: `${box} / ${refMm}` }}>
      <span className="pdp-fig" style={{ left: `${((box - w) / 2 / box) * 100}%`, width: `${(w / box) * 100}%`, height: `${(f.heightMm / refMm) * 100}%` }}>
        <FigureImage f={f} sizes="96px" />
      </span>
    </span>
  );
}
