import Image from "next/image";
import type { Pack } from "@/lib/shop/packs";
import { Button } from "@/components/ui";

/** The faction's entry product: the clearest way to start, shown wider than the catalogue. */
export function StarterBlock({ pack, href, price, title, text, cta }: { pack: Pack; href: string; price?: string | null; title: string; text: string; cta: string }) {
  return (
    <section className="grid items-center gap-6 border border-accent/40 bg-coal p-5 sm:grid-cols-[minmax(0,12rem)_1fr] md:gap-10 md:p-8">
      {pack.image && <Image src={pack.image} alt={pack.title} width={400} height={800} loading="lazy" className="mx-auto h-auto w-40 sm:w-full" />}
      <div>
        <h2 className="font-display text-3xl text-accent">{title}</h2>
        <p lang="es" className="mt-2 font-display text-xl">{pack.title}</p>
        <p className="mt-2 max-w-xl text-ivory/90">{text}</p>
        <div className="mt-5 flex flex-wrap items-center gap-5">
          {price && <p className="font-display text-3xl text-gold">{price}</p>}
          <Button href={href}>{cta}</Button>
        </div>
      </div>
    </section>
  );
}
