import Image from "next/image";
import { ElementCanvas } from "@/components/ElementCanvas";
import { Button } from "@/components/ui";
import { links } from "@/content/site";
import { elementFor } from "@/lib/element";
import type { Dict } from "@/lib/i18n";
import { shippingInfoText } from "@/lib/shop/shipping-info";

/** Slim shop header: title and one status line, so the products start high on the page. A closed shop adds the free rules. */
export function ShopHero({ t, title, image, imagePosition = "center", theme, emblem, lead, count, open, locale }: { t: Dict; title: string; image: string; imagePosition?: string; theme?: string; emblem?: string; lead?: string; count: number; open: boolean; locale: string }) {
  const c = t.catalogue;
  const products = `${count} ${c.count[count === 1 ? 0 : 1]}`;
  const element = elementFor(theme);
  return (
    <div data-faction={theme} className="relative isolate overflow-hidden border-b border-gold/25 bg-coal">
      <Image src={image} alt="" fill priority sizes="100vw" className="-z-20 object-cover" style={{ objectPosition: imagePosition }} />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-abyss via-abyss/90 to-abyss/30 max-md:bg-abyss/75" aria-hidden />
      {element && <ElementCanvas element={element} />}
      <div className="relative mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-x-10 gap-y-5 px-4 py-7 md:py-10">
        <div className="flex min-w-0 max-w-3xl items-center gap-4 md:gap-6">
          {emblem && <Image src={emblem} alt="" width={96} height={96} className="h-14 w-auto shrink-0 object-contain md:h-20" />}
          <div className="min-w-0">
            <h1 className="font-display text-4xl tracking-wide text-ivory md:text-5xl">{title}</h1>
            {lead && <p className="mt-1 text-ivory/90">{lead}</p>}
            <p role={open ? undefined : "note"} className="mt-2 max-w-2xl text-base text-ivory/85">
              {count > 0 ? (open ? `${products}. ${t.shop.taxIncluded}.` : `${products}. ${t.shop.taxIncluded}. ${t.shop.closed}`) : t.shop.empty}
            </p>
            {open && count > 0 && <p className="mt-1 max-w-2xl text-sm text-ivory/75">{shippingInfoText(t.shop.shippingInfo, locale)}</p>}
          </div>
        </div>
        {!open && <Button href={links.rules} external>{t.hero.cta3}</Button>}
      </div>
    </div>
  );
}
