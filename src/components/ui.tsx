import Image from "next/image";
import Link from "next/link";
import { Particles, particleKind } from "@/components/Particles";
import type { ReactNode } from "react";

/** Brand rule: the name "SphereWars" is always set in Abaddon; the rest of a title stays in Cinzel. */
export function BrandText({ text }: { text: string }) {
  return text.split(/(SphereWars)/i).map((part, i) => (i % 2 ? <span key={i} className="font-wordmark">SphereWars</span> : part));
}

export function Button({ href, children, variant = "solid", external }: { href: string; children: ReactNode; variant?: "solid" | "ghost"; external?: boolean }) {
  const look = variant === "solid" ? "bg-gold text-abyss hover:bg-ivory" : "border border-gold/70 text-ivory hover:border-gold hover:bg-gold/15";
  const cls = `btn inline-flex min-h-12 items-center px-6 py-3 font-display text-sm font-semibold tracking-[0.06em] ${look}`;
  return external ? <a href={href} className={cls} rel="noopener">{children}</a> : <Link href={href} className={cls}>{children}</Link>;
}

export function Section({ title, lead, children, id, compact }: { title: string; lead?: string; children?: ReactNode; id?: string; compact?: boolean }) {
  return (
    <section id={id} data-reveal className={`mx-auto max-w-7xl px-4 ${compact ? "py-10 md:py-14" : "py-16 md:py-24"}`}>
      <h2 className="font-display text-3xl tracking-wide text-ivory md:text-5xl"><BrandText text={title} /></h2>
      {lead && <p className="mt-3 max-w-2xl text-stone">{lead}</p>}
      <hr className={`rune-divider ${compact ? "my-6" : "my-8"}`} />
      {children}
    </section>
  );
}

export function PageHero({ title, lead, theme, image }: { title: string; lead?: string; theme?: string; image?: string }) {
  return (
    <div data-faction={theme} className="relative overflow-hidden border-b border-gold/20 bg-coal">
      {image && <Image src={image} alt="" fill priority sizes="100vw" className="object-cover object-center opacity-60" />}
      {image && <div className="absolute inset-0 bg-gradient-to-t from-abyss via-abyss/60 to-abyss/30" aria-hidden />}
      <div className="mist absolute inset-0" aria-hidden />
      <Particles kind={particleKind(theme)} count={18} />
      <div className="relative mx-auto max-w-7xl px-4 py-20 md:py-28">
        <h1 className="fade-up font-display text-4xl tracking-wide text-ivory md:text-6xl"><BrandText text={title} /></h1>
        {lead && <p className="fade-up mt-4 max-w-2xl text-lg text-stone">{lead}</p>}
      </div>
    </div>
  );
}

/** Honest empty state: nothing is simulated while official content is missing. */
export function Pending({ children, label = "Pendiente" }: { children: ReactNode; label?: string }) {
  return (
    <div role="note" className="border border-dashed border-gold/40 bg-coal/60 p-6 text-sm text-stone">
      <span className="mb-2 block text-xs uppercase tracking-widest text-gold">{label}</span>
      {children}
    </div>
  );
}
