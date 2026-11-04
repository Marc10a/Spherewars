import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Dice6, FileText, Layers, Mountain, Ruler } from "lucide-react";
import { dict, isLocale, locales } from "@/lib/i18n";
import { factions, getFaction } from "@/content/factions";
import docs from "@/content/shop-products.json";
import { Button } from "@/components/ui";
import { links } from "@/content/site";
import { formatPrice, listSellableProducts, mediaUrl, type Product } from "@/lib/data";
import { shopReadiness } from "@/lib/shop/settings";
import { productFacts } from "@/lib/shop/facts";
import { productForMiniature } from "@/lib/shop/match";
import { packFor } from "@/lib/shop/packs";
import { characterInfo, factionCharacters, miniPhotos, miniVisual, ownerPhotos, shopKey } from "@/lib/wiki";
import { jsonLd, pageMeta, siteUrl } from "@/lib/seo";
import { ProductGallery } from "@/components/shop/ProductGallery";
import { BuyBox } from "@/components/shop/BuyBox";
import type { RelatedItem } from "@/components/shop/add-confirm-store";

const last = (slug: string) => slug.split("/").pop()!;
const docOf = (key: string) => (docs.products as unknown as Record<string, { lore?: string[] }>)[key] ?? null;
const bare = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").replace(/\s*\([^)]*\)\s*$/, "").trim().toLowerCase();
/** Specs already shown in the facts block or next to the buy button. */
const FACT_LABELS = new Set(["Facción", "Puntos de Banda", "Peana", "Altura", "Número de miniaturas", "Estado"]);

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

/** Same-faction singles on sale that are not in the faction's Starter Pack, in the official order. */
function relatedSingles(factionSlug: string, ownKey: string, products: Product[], locale: string): RelatedItem[] {
  const inPack = new Set((productFacts(`packs/${factionSlug}`)?.items ?? []).map(bare));
  return factionCharacters(factionSlug).flatMap((m): RelatedItem[] => {
    const facts = productFacts(m.slug);
    const name = facts?.title ?? m.title;
    const p = productForMiniature(products, m.slug);
    const price = p?.sellable && p.stock !== 0 ? formatPrice(p.price_cents, p.currency, locale) : null;
    if (!p || !price || m.slug === ownKey || inPack.has(bare(name))) return [];
    const clean = ownerPhotos(m.slug)?.gallery.find((g) => g.kind === "clean");
    const visual = clean ?? miniVisual(m);
    return [{ id: p.id, name, href: `/${locale}/tienda/${factionSlug}/${last(m.slug)}`, image: visual?.src ?? null, price }];
  });
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; faccion: string; mini: string }> }) {
  const { locale, faccion, mini } = await params;
  const hit = find(faccion, mini);
  if (!hit) return {};
  const facts = productFacts(hit.key);
  const photo = hit.page ? miniPhotos(hit.page)[0]?.src : ownerPhotos(hit.key)?.tile;
  // SEO text: the official product description (or the wiki text), never invented.
  return pageMeta({ title: `${hit.title} · ${dict[isLocale(locale) ? locale : "es"].shop.title}`, description: facts?.intro ?? hit.page?.description ?? undefined, path: `/tienda/${faccion}/${mini}`, image: photo }, locale);
}

export default async function Page({ params }: { params: Promise<{ locale: string; faccion: string; mini: string }> }) {
  const { locale, faccion, mini } = await params;
  const hit = isLocale(locale) ? find(faccion, mini) : null;
  if (!isLocale(locale) || !hit) notFound();
  const { f, page, key } = hit;
  const t = dict[locale];
  const s = t.shop;
  const facts = productFacts(key);
  const lore = docOf(shopKey(key))?.lore ?? [];
  const title = facts?.title ?? hit.title; // the official name, model count included: "Leva Demontre (3)"
  const info = page ? characterInfo(page) : null; // short official wiki text, never invented

  const [products, ready] = await Promise.all([listSellableProducts(), shopReadiness()]);
  const product = productForMiniature(products, key);
  const own = product ? mediaUrl(product.image_path) : null;
  const ownerShots = ownerPhotos(key)?.gallery.map((g) => ({ src: g.src, alt: title })) ?? [];
  const wikiPhotos = page ? miniPhotos(page).map((p) => ({ src: p.src, alt: title, art: p.kind === "illustration" })) : ownerShots;
  // WooCommerce gallery first (only images hosted on the WooCommerce domain, which next/image is configured for), then the official ones.
  const wcHost = process.env.WC_API_URL ? new URL(process.env.WC_API_URL).hostname : null;
  const wooPhotos = (product?.images ?? []).filter((i) => { try { return i.src.startsWith("https://") && new URL(i.src).hostname === wcHost; } catch { return false; } });
  // With a WooCommerce gallery the owner manages the photos there: only the illustrations are added, or the same photo would show twice.
  const photos = [...(own ? [{ src: own, alt: product?.image_alt ?? title }] : []), ...wooPhotos, ...(wooPhotos.length ? wikiPhotos.filter((p) => "art" in p && p.art) : wikiPhotos)];

  const priced = Boolean(product?.sellable && product.price_cents && product.price_cents > 0);
  const price = priced && product ? formatPrice(product.price_cents, product.currency, locale) : null;
  // A sale is shown only when WooCommerce reports both prices and they differ. The crossed-out price is all it says: no savings claims.
  const regular = priced && product?.regular_price_cents && product.sale_price_cents && product.regular_price_cents !== product.sale_price_cents ? formatPrice(product.regular_price_cents, product.currency, locale) : null;
  const soldOut = product?.stock === 0;
  const canBuy = priced && ready.canCheckout && !soldOut;
  // One status per page: closed shop and missing price both read as "not on sale yet".
  const status = !priced || !ready.canCheckout ? s.statusNotOnSale : soldOut ? s.soldOut : s.statusAvailable;
  const url = `${siteUrl}/${locale}/tienda/${f.slug}/${mini}`;
  const related = canBuy ? relatedSingles(f.slug, key, products, locale) : [];
  const isPack = key.startsWith("packs/");

  const spec = (label: string) => facts?.specs.find((x) => x.label === label)?.value ?? null;
  const models = spec("Número de miniaturas") ?? (facts?.models ? String(facts.models) : null);
  const statCells = ([[s.factPoints, spec("Puntos de Banda")], [s.factBase, spec("Peana")], [s.factHeight, spec("Altura")], ...(isPack ? [[s.factModels, models]] : [])] as [string, string | null][]).filter((c): c is [string, string] => Boolean(c[1]));
  const estado = spec("Estado");
  const extraSpecs = (facts?.specs ?? []).filter((x) => !FACT_LABELS.has(x.label));
  const need = [[Dice6, s.needDice], [Ruler, s.needTape], [Layers, s.needCounters], [Mountain, s.needScenery]] as const;
  const h2 = "font-display text-2xl text-ivory md:text-3xl";

  return (
    <div data-faction={f.theme} className="bg-[linear-gradient(180deg,var(--land-tint),var(--abyss)_32rem)]">
      <div className="mx-auto max-w-7xl px-4 pt-6 max-lg:hidden">
        <nav aria-label="breadcrumb" className="text-sm text-stone">
          <Link href={`/${locale}/tienda`} className="hover:text-gold">{s.title}</Link> / <Link href={`/${locale}/tienda/${f.slug}`} className="hover:text-gold">{f.name}</Link>
        </nav>
      </div>

      <section className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-4 px-4 pb-12 pt-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14 lg:pb-20 lg:pt-6">
        <div data-wp-slot="gallery" className="lg:sticky lg:top-20 lg:self-start">
          {photos.length > 0 ? (
            <ProductGallery photos={photos} labels={{ prev: s.prevPhoto, next: s.nextPhoto, zoom: s.zoomIn, zoomToggle: s.zoomToggle, close: t.a11y.close, photoOf: s.photoOf, gallery: s.gallery }} />
          ) : (
            <div className="spot grid place-items-center border border-accent/30 text-center max-lg:h-[31svh] max-lg:min-h-40 lg:h-[min(72svh,46rem)]">
              <div><span className="block font-display text-8xl text-accent/40" aria-hidden>{title.charAt(0)}</span><span className="mt-2 block font-display text-base text-stone">{t.common.provisional}</span></div>
            </div>
          )}
        </div>

        <div>
          <h1 lang="es" className="font-display text-3xl leading-tight md:text-5xl">{title}</h1>
          <p className="mt-1 font-display text-lg lg:mt-2"><Link href={`/${locale}/tienda/${f.slug}`} className="text-accent underline-offset-4 hover:underline">{f.name}</Link></p>

          <div data-wp-slot="buy" className="mt-3 lg:mt-6">
            {price && (
              <p className="flex flex-wrap items-baseline gap-x-3">
                <span className="font-display text-4xl text-gold tabular-nums">{price}</span>
                {regular && <span className="text-lg text-stone tabular-nums"><span className="sr-only">{s.regularPrice}: </span><s>{regular}</s></span>}
                <span className="text-sm text-stone">{s.taxIncluded}</span>
              </p>
            )}
            <p className={`mt-1 flex items-center gap-2 text-base ${canBuy ? "text-ivory" : "text-stone"}`}>
              <span aria-hidden className={`size-2 ${canBuy ? "bg-gold" : "border border-stone"}`} />{status}
            </p>
            {!priced && <p className="mt-1 text-sm text-stone">{s.pricePending}</p>}

            <div className="mt-4 lg:mt-6">
              {canBuy && product ? (
                <BuyBox locale={locale} related={related}
                  item={{ id: product.id, slug: product.slug, name: title, price_cents: product.price_cents!, image: photos[0]?.src ?? null, stock: product.stock }}
                  labels={{ qty: s.qty, add: s.add, added: s.added, buyNow: s.buyNow, viewCart: s.viewCart, soldOut: s.soldOut, qtyLess: s.qtyLess, qtyMore: s.qtyMore }} />
              ) : (
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 max-sm:[&>a:first-child]:w-full max-sm:[&>a:first-child]:justify-center">
                  <Button href={links.rules} external>{s.downloadRules}</Button>
                  <Link href={`/${locale}/tienda/${f.slug}`} className="inline-flex min-h-11 items-center font-display text-base text-gold underline-offset-4 hover:underline">{s.moreOfFaction.replace("{faction}", f.name)}</Link>
                </div>
              )}
            </div>
          </div>
          {estado && <p className="mt-3 text-sm text-stone">{/sin montar/i.test(estado) ? s.unassembled : <span lang="es">{estado}</span>}</p>}

          <div className="mt-10 space-y-10 lg:mt-12">
            {(facts?.items.length || (!isPack && facts?.models)) ? (
              <section>
                <h2 className={h2}>{s.contents}</h2>
                {facts.items.length > 0 ? (
                  <ul lang="es" className="mt-3 divide-y divide-gold/15 border-y border-gold/15 text-base">{facts.items.map((i) => <li key={i} className="py-2.5">{i}</li>)}</ul>
                ) : (
                  <p className="mt-3 text-base">{s.modelsCount.replace("{n}", String(facts.models))}</p>
                )}
              </section>
            ) : null}

            {(statCells.length > 0 || estado) && (
              <section>
                <h2 className={h2}>{s.factsTitle}</h2>
                <dl className="mt-3 border border-gold/25 bg-coal/60">
                  {statCells.length > 0 && (
                    <div className="grid grid-flow-col auto-cols-fr divide-x divide-gold/25">
                      {statCells.map(([label, value]) => (
                        <div key={label} className="flex flex-col-reverse justify-end gap-1 p-3 md:p-4">
                          <dt className="text-sm text-stone">{label}</dt>
                          <dd lang="es" className="font-display text-2xl leading-tight text-gold tabular-nums md:text-3xl">{value}</dd>
                        </div>
                      ))}
                    </div>
                  )}
                  {estado && (
                    <div className={`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 p-3 md:p-4 ${statCells.length > 0 ? "border-t border-gold/25" : ""}`}>
                      <dt className="text-sm text-stone">{s.factAssembly}</dt>
                      <dd className="font-display text-lg">{/sin montar/i.test(estado) ? s.unassembled : <span lang="es">{estado}</span>}</dd>
                    </div>
                  )}
                </dl>
              </section>
            )}

            <section>
              <h2 className={h2}>{s.needTitle}</h2>
              <ul className="mt-3 divide-y divide-gold/15 border-y border-gold/15 text-base">
                {need.map(([Icon, label]) => (
                  <li key={label} className="flex items-center gap-3 py-2.5"><Icon size={20} aria-hidden className="shrink-0 text-gold" />{label}</li>
                ))}
                <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                  <span className="flex items-center gap-3"><FileText size={20} aria-hidden className="shrink-0 text-gold" />{s.needRules}</span>
                  <a href={links.rules} rel="noopener" className="ml-8 inline-flex min-h-6 items-center text-gold underline underline-offset-4 hover:text-ivory sm:ml-auto">{s.needRulesLink}</a>
                </li>
              </ul>
            </section>

            {(facts || info?.excerpt) && (
              <section>
                <h2 className={h2}>{s.officialDescription}</h2>
                <div lang="es" className="mt-3 max-w-[68ch] space-y-4 text-base leading-relaxed text-ivory/85">
                  <p>{facts?.intro ?? info?.excerpt}</p>
                  {lore.map((para) => <p key={para}>{para}</p>)}
                  {!facts && info?.race && <p className="text-accent">{t.factions.raceLabel}: {info.race}</p>}
                </div>
                {extraSpecs.length > 0 && (
                  <dl lang="es" className="mt-5 divide-y divide-gold/15 border-y border-gold/15 text-base">
                    {extraSpecs.map(({ label, value }) => (
                      <div key={label} className="grid grid-cols-[8.5rem_1fr] gap-3 py-2.5"><dt className="text-stone">{label}</dt><dd>{value}</dd></div>
                    ))}
                  </dl>
                )}
              </section>
            )}

            {page && <p><Link href={`/${locale}/wikisphere/${page.slug}`} className="font-display text-lg text-gold underline underline-offset-4 hover:text-ivory">{t.factions.readFull}</Link></p>}
          </div>
        </div>
      </section>

      {isPack && related.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-16 lg:pb-24">
          <h2 className={h2}>{s.crossTitle}</h2>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 max-sm:[&>li:nth-child(3)]:hidden">
            {related.slice(0, 3).map((r) => (
              <li key={r.id}>
                <Link href={r.href} className="tilt-card group block border border-accent/25 bg-coal">
                  <span className="spot relative block aspect-square">
                    {r.image && <Image src={r.image} alt="" fill sizes="(min-width:640px) 30vw, 50vw" loading="lazy" className="object-contain p-3" />}
                  </span>
                  <span lang="es" className="block px-3 pt-3 font-display text-lg leading-tight group-hover:text-accent">{r.name}</span>
                  <span className="block px-3 pb-3 pt-1 text-base text-stone tabular-nums">{r.price}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {priced && product && price && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd({
          "@context": "https://schema.org", "@type": "Product", name: title, url, brand: { "@type": "Brand", name: "SphereWars" }, ...(facts?.ref ? { sku: facts.ref } : {}),
          image: photos.map((p) => (p.src.startsWith("http") ? p.src : `${siteUrl}${p.src}`)),
          offers: {
            "@type": "Offer", url, priceCurrency: product.currency ?? "EUR", price: ((product.price_cents ?? 0) / 100).toFixed(2),
            availability: canBuy ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          },
        }) }} />
      )}
    </div>
  );
}
