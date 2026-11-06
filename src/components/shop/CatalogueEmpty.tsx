import Image from "next/image";
import Link from "next/link";

/** A filter combination with nothing on sale: say so plainly and offer the two ways out. Never an empty grid. */
export function CatalogueEmpty({ text, emblem, actions }: { text: string; emblem?: string; actions: { href: string; label: string; solid?: boolean }[] }) {
  return (
    <div className="shop-empty">
      {emblem && <Image src={emblem} alt="" width={72} height={72} className="h-16 w-auto object-contain opacity-80" />}
      <p className="max-w-md font-display text-xl text-ivory md:text-2xl">{text}</p>
      <div className="flex flex-wrap justify-center gap-3">
        {actions.map((a) => (
          <Link key={a.href} href={a.href} scroll={false} className={`btn inline-flex min-h-12 items-center px-5 font-display text-base ${a.solid ? "btn-solid bg-gold text-abyss hover:bg-ivory" : "border border-gold/70 text-ivory hover:border-gold hover:bg-gold/15"}`}>{a.label}</Link>
        ))}
      </div>
    </div>
  );
}
