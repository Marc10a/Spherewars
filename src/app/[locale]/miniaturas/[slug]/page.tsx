import Image from "next/image";
import { notFound } from "next/navigation";
import { dict, isLocale } from "@/lib/i18n";
import { factions } from "@/content/factions";
import { formatPrice, getProduct, mediaUrl } from "@/lib/data";
import { pageMeta } from "@/lib/seo";
import { Button, PageHero } from "@/components/ui";
import { RichText } from "@/components/RichText";
import { AddToCart } from "@/components/shop/AddToCart";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const p = await getProduct(slug);
  return pageMeta({ title: p?.name, path: `/miniaturas/${slug}` }, locale);
}

export default async function Page({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const t = dict[locale].minis;
  const p = await getProduct(slug);
  if (!p) notFound();
  const faction = factions.find((f) => f.slug === p.factions?.slug);
  const img = mediaUrl(p.image_path);
  const price = formatPrice(p.price_cents, p.currency, locale);

  return (
    <div data-faction={faction?.theme}>
      <PageHero title={p.name} lead={faction?.name} theme={faction?.theme} />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-2">
        <div className="relative aspect-square border border-gold/20 bg-coal">
          {img && <Image src={img} alt={p.image_alt ?? p.name} fill sizes="(min-width:768px) 50vw, 100vw" className="object-contain" priority />}
        </div>
        <div className="space-y-5">
          <RichText md={p.description?.text} />
          {p.contents && <p><span className="font-display text-sm text-gold">{t.contents}</span><br />{p.contents}</p>}
          <p className="text-sm text-stone">{t.status}: {p.commercial_status}{price ? ` · ${price}` : ""}</p>
          {p.sellable && price && (
            <div className="space-y-3 border border-gold/30 bg-coal p-5">
              <p className="font-display text-3xl text-gold">{price}</p>
              <p className="text-xs text-stone">{dict[locale].shop.taxIncluded}</p>
              <AddToCart
                locale={locale}
                item={{ id: p.id, slug: p.slug, name: p.name, price_cents: p.price_cents!, image: img, stock: p.stock }}
                labels={{ add: dict[locale].shop.add, added: dict[locale].shop.added, soldOut: dict[locale].shop.soldOut, viewCart: dict[locale].shop.viewCart }}
              />
            </div>
          )}
          <div className="flex flex-wrap gap-4">
            {p.buy_url && <Button href={p.buy_url} external>{t.buy}</Button>}
            {p.profile_url && <Button href={p.profile_url} variant="ghost" external>{t.profile}</Button>}
          </div>
        </div>
      </div>
    </div>
  );
}
