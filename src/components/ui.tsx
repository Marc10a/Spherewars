import Image from "next/image";
import Link from "next/link";
import { ElementCanvas } from "@/components/ElementCanvas";
import { elementFor } from "@/lib/element";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/Wordmark";

/**
 * Brand rule: the name "SphereWars" is always the Abaddon wordmark, drawn as an image (.wordmark: the font has no web licence);
 * the rest of a title stays in Federo. See Wordmark: the name stays readable for screen readers and search.
 */
export function BrandText({ text }: { text: string }) {
  return text.split(/(SphereWars)/i).map((part, i) => (i % 2 ? <Wordmark key={i} /> : part));
}

export function Button({ href, children, variant = "solid", external }: { href: string; children: ReactNode; variant?: "solid" | "ghost"; external?: boolean }) {
  const look = variant === "solid" ? "btn-solid bg-gold text-abyss hover:bg-ivory" : "border border-gold/70 text-ivory hover:border-gold hover:bg-gold/15";
  const cls = `btn inline-flex min-h-12 items-center px-6 py-3 font-display text-base tracking-[0.03em] ${look}`;
  return external ? <a href={href} className={cls} rel="noopener">{children}</a> : <Link href={href} className={cls}>{children}</Link>;
}

export function Section({ title, lead, children, id, compact }: { title: string; lead?: string; children?: ReactNode; id?: string; compact?: boolean }) {
  return (
    <section id={id} data-reveal className={`mx-auto max-w-7xl px-4 ${compact ? "py-10 md:py-14" : "py-16 md:py-24"}`}>
      <h2 className="font-display text-3xl tracking-wide text-ivory md:text-5xl"><BrandText text={title} /></h2>
      {lead && <p className="mt-3 max-w-2xl text-ivory/85"><BrandText text={lead} /></p>}
      <hr className={`rune-divider ${compact ? "my-6" : "my-8"}`} />
      {children}
    </section>
  );
}

export const chipCls = (active: boolean) => `btn inline-flex min-h-11 items-center border px-4 font-display text-base ${active ? "border-gold bg-gold text-abyss" : "border-gold/50 text-ivory hover:border-gold hover:bg-gold/15"}`;

export function PageHero({ title, lead, theme, image, imagePosition = "center", emblem, children }: { title: string; lead?: string; theme?: string; image?: string; imagePosition?: string; emblem?: string; children?: ReactNode }) {
  return (
    <div data-faction={theme} className="relative isolate overflow-hidden border-b border-gold/25 bg-coal">
      {image && <Image src={image} alt="" fill priority sizes="100vw" className="-z-20 object-cover" style={{ objectPosition: imagePosition }} />}
      {image && <div className="absolute inset-0 -z-10 bg-gradient-to-r from-abyss via-abyss/80 to-abyss/10 max-md:bg-abyss/70" aria-hidden />}
      {image && elementFor(theme) && <ElementCanvas element={elementFor(theme)!} />}
      <div className={`relative mx-auto flex max-w-7xl flex-col justify-end px-4 py-10 ${image ? "min-h-64 md:min-h-96 md:py-14" : "md:py-14"}`}>
        {emblem && <Image src={emblem} alt="" width={96} height={96} className="mb-4 h-20 w-auto self-start object-contain" />}
        <h1 className="max-w-3xl font-display text-4xl tracking-wide text-ivory md:text-6xl"><BrandText text={title} /></h1>
        {lead && <p className="mt-4 max-w-2xl text-lg text-ivory/90"><BrandText text={lead} /></p>}
        {children && <div className="mt-6 flex flex-wrap gap-3">{children}</div>}
      </div>
    </div>
  );
}

/** Honest empty state: nothing is simulated while official content is missing. */
export function Pending({ children, label = "Pendiente" }: { children: ReactNode; label?: string }) {
  return <p role="note" aria-label={label} className="max-w-2xl border-t border-gold/30 pt-4 text-ivory/80">{children}</p>;
}
