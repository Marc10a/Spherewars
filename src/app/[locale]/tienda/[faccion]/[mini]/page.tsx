import Link from "next/link";
import { notFound } from "next/navigation";
import { dict, isLocale, locales } from "@/lib/i18n";
import { factions, getFaction } from "@/content/factions";
import docs from "@/content/shop-products.json";
import { formatPrice, listSellableProducts, mediaUrl } from "@/lib/data";
import { shopReadiness } from "@/lib/shop/settings";
import { productForMiniature } from "@/lib/shop/match";
import { packFor } from "@/lib/shop/packs";
import { characterInfo, factionCharacters, miniPhotos, ownerPhotos, shopKey } from "@/lib/wiki";
import { jsonLd, pageMeta, siteUrl } from "@/lib/seo";
import { ProductGallery } from "@/components/shop/ProductGallery";
import { BuyBox } from "@/components/shop/BuyBox";

const last = (slug: string) => slug.split("/").pop()!;
type Doc = { title: string; ref: string | null; intro: string; lore: string[]; items: string[]; specs: [string, string][]; closing: string };
const docOf = (key: string) => (docs.products as unknown as Record<string, Doc>)[key] ?? null;

export const generateStaticParams = () =>
  locales.flatMap((locale) => factions.flatMap((f) => [
    ...(packFor(f.slug) ? [{ locale, faccion: f.slug, mini: "starter-pack" }] : []),
    ...factionCharacters(f.slug).map((m) => ({ locale, faccion: f.slug, mini: last(m.slug) })),
  ]));

/** What the URL points to: a wiki miniature, or the faction's Starter Pack. */
function find(faccion: string, mini: string) {
  const f = getFaction(faccion);
  if (!f) return null;
  if (mini === "starter-pack") {
    const pack = packFor(f.slug);
    return pack ? { f, page: null, key: pack.key, title: pack.title } : null;
  }
  const page = factionCharacters(f.slug).find((m) => last(m.slug) === mini);
  return page ? { f, page, key: page.slug, title: page.title } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; faccion: string; mini: string }> }) {
  const { locale, faccion, mini } = await params;
  const hit = find(faccion, mini);
  if (!hit) return {};
  const doc = docOf(shopKey(hit.key));
  const photo = hit.page ? miniPhotos(hit.page)[0]?.src : ownerPhotos(hit.key)?.tile;
  // SEO text: the official product description (or the wiki text), never invented.
  return pageMeta({ title: `${hit.title} · ${dict[isLocale(locale) ? locale : "es"].shop.title}`, description: doc?.intro ?? hit.page?.description ?? undefined, path: `/tienda/${faccion}/${mini}`, image: photo }, locale);
}

export default async function Page({ params }: { params: Promise<{ locale: string; faccion: string; mini: string }> }) {
  const { locale, faccion, mini } = await params;
  const hit = isLocale(locale) ? find(faccion, mini) : null;
  if (!isLocale(locale) || !hit) notFound();
  const { f, page, key } = hit;
  const t = dict[locale];
  const doc = docOf(shopKey(key));
  const title = (doc?.title ?? hit.title).replace(/\s*\(\d+\)$/, ""); // official product name
  const info = page ? characterInfo(page) : null; // short official wiki text, never invented

  const [products, ready] = await Promise.all([listSellableProducts(), shopReadiness()]);
  const product = productForMiniature(products, key);
  const own = product ? mediaUrl(product.image_path) : null;
  const ownerShots = ownerPhotos(key)?.gallery.map((g) => ({ src: g.src, alt: title })) ?? [];
  const wikiPhotos = page ? miniPhotos(page).map((p) => ({ src: p.src, alt: title, art: p.kind === "illustration" })) : ownerShots;
  // WooCommerce gallery first (only images hosted on the WooCommerce domain, which next/image is configured for), then the official ones.
  const wcHost = process.env.WC_API_URL ? new URL(process.env.WC_API_URL).hostname : null;
  const wooPhotos = (product?.images ?? []).filter((i) => { try { return i.src.startsWith("https://") && new URL(i.src).hostname === wcHost; } catch { return false; } });
  const photos = [...(own ? [{ src: own, alt: product?.image_alt ?? title }] : []), ...wooPhotos, ...wikiPhotos];

  const buyable = Boolean(product?.sellable && product.price_cents && product.price_cents > 0);
  const price = buyable && product ? formatPrice(product.price_cents, product.currency, locale) : null;
  const url = `${siteUrl}/${locale}/tienda/${f.slug}/${mini}`;

  return (
    <div data-faction={f.theme}>
      <div className="mx-auto max-w-6xl px-4 pt-8">
        <nav aria-label="breadcrumb" className="text-xs uppercase tracking-widest text-stone">
          <Link href={`/${locale}/tienda`} className="hover:text-gold">{t.shop.title}</Link> / <Link href={`/${locale}/tienda/${f.slug}`} className="hover:text-gold">{f.name}</Link>
        </nav>
      </div>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:py-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14">
        <div data-wp-slot="gallery" className="mx-auto w-full max-w-xl lg:max-w-none">
        {photos.length > 0 ? (
          <ProductGallery photos={photos} labels={{ prev: t.shop.prevPhoto, next: t.shop.nextPhoto, zoom: t.shop.zoomIn, zoomToggle: t.shop.zoomToggle, close: t.a11y.close, photoOf: t.shop.photoOf, gallery: t.shop.gallery }} />
        ) : (
          <div className="grid aspect-[4/5] place-items-center border border-accent/30 bg-coal text-center">
            <div><span className="block font-display text-8xl text-accent/40" aria-hidden>{title.charAt(0)}</span><span className="mt-2 block text-xs uppercase tracking-[0.3em] text-stone">{t.common.provisional}</span></div>
          </div>
        )}
        </div>

        <div className="lg:pt-4">
          <p className="font-display text-xs uppercase tracking-[0.3em] text-accent">{f.name}</p>
          <h1 lang="es" className="mt-2 font-display text-3xl leading-tight md:text-5xl">{title}</h1>
          {doc ? <p lang="es" className="mt-4 text-base leading-relaxed text-ivory/80">{doc.intro}</p>
            : info?.excerpt && <p lang="es" className="mt-4 line-clamp-4 text-base leading-relaxed text-ivory/80">{info.excerpt}</p>}
          {!doc && info?.race && <p className="mt-2 text-xs uppercase tracking-widest text-accent">{t.factions.raceLabel}: <span lang="es">{info.race}</span></p>}
          <hr className="rune-divider my-6" />

          <div data-wp-slot="buy">
          {buyable && product && price ? (
            <>
              <p className="font-display text-4xl text-gold">{price}</p>
              <p className="mt-1 text-xs text-stone">{t.shop.taxIncluded}</p>
              <div className="mt-6">
                <BuyBox locale={locale}
                  item={{ id: product.id, slug: product.slug, name: product.name, price_cents: product.price_cents!, image: photos[0]?.src ?? null, stock: product.stock }}
                  labels={{ qty: t.shop.qty, add: t.shop.add, added: t.shop.added, buyNow: t.shop.buyNow, viewCart: t.shop.viewCart, soldOut: t.shop.soldOut }} />
              </div>
              {!ready.canCheckout && <p role="note" className="mt-4 border border-dashed border-gold/40 p-3 text-sm text-stone">{t.shop.closed}</p>}
            </>
          ) : (
            <div role="status">
              <p className="inline-block border border-dashed border-stone/50 px-4 py-2 text-xs uppercase tracking-[0.2em] text-stone">{t.shop.unavailable}</p>
              <p className="mt-3 text-sm text-stone">{t.shop.unavailableNote} {t.shop.pricePending}.</p>
              <button type="button" disabled className="mt-6 w-full cursor-not-allowed bg-gold/30 px-6 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-abyss/70">{t.shop.buyNow}</button>
            </div>
          )}
          </div>

          {doc && (
            <div className="mt-10 space-y-6">
              {doc.items.length > 0 && (
                <div>
                  <h2 className="text-xs uppercase tracking-widest text-gold">{t.shop.contents}</h2>
                  <ul lang="es" className="mt-2 list-disc space-y-1 pl-5 text-sm text-ivory/85">{doc.items.map((i) => <li key={i}>{i}</li>)}</ul>
                </div>
              )}
              <div>
                <h2 className="text-xs uppercase tracking-widest text-gold">{t.shop.specs}</h2>
                <dl className="mt-2 grid gap-2 text-sm">
                  {doc.specs.map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[9rem_1fr] gap-2 border-b border-gold/10 pb-2"><dt lang="es" className="text-stone">{k}</dt><dd lang="es">{v}</dd></div>
                  ))}
                </dl>
              </div>
              {doc.lore.length > 0 && (
                <details className="border border-gold/20 bg-coal p-4">
                  <summary className="cursor-pointer text-xs uppercase tracking-widest text-gold">{t.shop.lore}</summary>
                  <div lang="es" className="mt-3 space-y-3 text-sm leading-relaxed text-ivory/80">{doc.lore.map((p, i) => <p key={i}>{p}</p>)}</div>
                </details>
              )}
            </div>
          )}
        </div>
      </section>

      {buyable && product && price && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd({
          "@context": "https://schema.org", "@type": "Product", name: title, url, brand: { "@type": "Brand", name: "SphereWars" }, ...(doc?.ref ? { sku: doc.ref } : {}),
          image: photos.map((p) => (p.src.startsWith("http") ? p.src : `${siteUrl}${p.src}`)),
          offers: {
            "@type": "Offer", url, priceCurrency: product.currency ?? "EUR", price: ((product.price_cents ?? 0) / 100).toFixed(2),
            availability: product.stock === 0 ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
          },
        }) }} />
      )}
    </div>
  );
}
