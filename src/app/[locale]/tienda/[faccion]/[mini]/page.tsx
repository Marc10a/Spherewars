import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Dice6, FileText, Layers, Mountain, Ruler } from "lucide-react";
import { dict, isLocale, locales, type Dict } from "@/lib/i18n";
import { factions, getFaction, type Faction } from "@/content/factions";
import { Button } from "@/components/ui";
import { links } from "@/content/site";
import { formatPrice, listSellableProducts, mediaUrl, type Product } from "@/lib/data";
import { shopReadiness } from "@/lib/shop/settings";
import { productCopy, productFacts, specText } from "@/lib/shop/facts";
import { productForMiniature } from "@/lib/shop/match";
import { packFor } from "@/lib/shop/packs";
import { characterArt, characterInfo, factionCharacters, miniPhotos, miniVisual, ownerPhotos, shopKey } from "@/lib/wiki";
import { elementFor } from "@/lib/element";
import { jsonLd, pageMeta, siteUrl } from "@/lib/seo";
import { ProductGallery, type GalleryPhoto } from "@/components/shop/ProductGallery";
import { BuyBox } from "@/components/shop/BuyBox";
import { AmbientVideo } from "@/components/shop/AmbientVideo";
import { ScaleLineup, type Figure } from "@/components/shop/ScaleLineup";
import { cutoutOf, localNum, scaleAnchor, scaleFigure, scaleHref } from "@/lib/shop/scale";
import { itemText } from "@/components/shop/facts-ui";
import { ElementCanvas } from "@/components/ElementCanvas";
import { shippingInfoText } from "@/lib/shop/shipping-info";
import type { RelatedItem } from "@/components/shop/add-confirm-store";

const last = (slug: string) => slug.split("/").pop()!;
const bare = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").replace(/\s*\([^)]*\)\s*$/, "").trim().toLowerCase();
/** Specs shown in the facts strip or next to the buy button; the rest go under the description. */
const SHOWN = new Set(["Facción", "Puntos de Banda", "Peana", "Altura", "Número de miniaturas", "Estado", "Dado de Vida", "Dados de Vida", "Subfacción"]);
/** Gallery order on the product page: the cut-out first (it stands on the stage), then the scene, the size shot and the card. */
const ORDER = ["group", "clean", "bg", "size", "card"];
const kindOf = (k: string) => (k.startsWith("bg") ? "bg" : k);

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
    if (!p || !price || shopKey(m.slug) === shopKey(ownKey) || inPack.has(bare(name))) return [];
    const visual = cutoutOf(m.slug) ?? miniVisual(m)?.src ?? null;
    return [{ id: p.id, name, href: `/${locale}/tienda/${factionSlug}/${last(m.slug)}`, image: visual, price }];
  });
}

/** A Starter Pack line ("Leva Demontre (3 miniaturas)") matched to the faction's miniature, when one has that name. */
function packItem(factionSlug: string, item: string, locale: string, t: Dict) {
  const want = bare(item);
  const m = factionCharacters(factionSlug).find((c) => {
    const names = [productFacts(c.slug)?.title, c.title].filter(Boolean).map((n) => bare(n!));
    return names.some((n) => n === want || n.startsWith(`${want},`) || want.startsWith(`${n} `) || n.startsWith(`${want} `));
  });
  const facts = m ? productFacts(m.slug) : null;
  const raw = facts?.specs.find((x) => x.label === "Altura")?.value ?? null;
  const height = raw ? localNum(raw, locale, t) : null;
  const tile = m ? ownerPhotos(m.slug)?.tile ?? null : null;
  const image = m ? cutoutOf(m.slug) ?? tile ?? miniVisual(m)?.src ?? null : null;
  return { label: itemText(item, t), href: m ? `/${locale}/tienda/${factionSlug}/${last(m.slug)}` : null, image, cut: Boolean(m && cutoutOf(m.slug)), height };
}

/** This miniature beside up to three of its faction (shortest, tallest and one in between), all with an official height and a cut-out photo. */
function lineup(f: Faction, key: string, locale: string, t: Dict): Figure[] {
  const fig = (slug: string, title: string) => scaleFigure(slug, `/${locale}/tienda/${f.slug}/${last(slug)}`, locale, t, title);
  const self = fig(key, "");
  if (!self) return [];
  const seen = new Set([self.key]);
  const others = factionCharacters(f.slug).flatMap((m) => {
    const x = fig(m.slug, m.title);
    if (!x || seen.has(x.key)) return [];
    seen.add(x.key);
    return [x];
  }).sort((a, b) => a.heightMm - b.heightMm);
  if (!others.length) return [];
  const pick = [...new Set([others[0], others[others.length - 1], others[Math.floor(others.length / 2)]])];
  return [{ ...self, current: true }, ...pick].sort((a, b) => a.heightMm - b.heightMm);
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; faccion: string; mini: string }> }) {
  const { locale, faccion, mini } = await params;
  const hit = find(faccion, mini);
  if (!hit) return {};
  const facts = productFacts(hit.key);
  const copy = productCopy(hit.key, locale);
  const photo = hit.page ? miniPhotos(hit.page)[0]?.src : ownerPhotos(hit.key)?.tile;
  // SEO text: the official product description (or the wiki text), never invented.
  // Same official name as the H1 ("Ródanes, Brazo de Metal"), in the visitor's language when a translation exists.
  return pageMeta({ title: `${facts?.title ?? hit.title} · ${dict[isLocale(locale) ? locale : "es"].shop.title}`, description: copy?.intro ?? hit.page?.description ?? undefined, path: `/tienda/${faccion}/${mini}`, image: photo }, locale);
}

export default async function Page({ params }: { params: Promise<{ locale: string; faccion: string; mini: string }> }) {
  const { locale, faccion, mini } = await params;
  const hit = isLocale(locale) ? find(faccion, mini) : null;
  if (!isLocale(locale) || !hit) notFound();
  const { f, page, key } = hit;
  const t = dict[locale];
  const s = t.shop;
  const d = t.pdp;
  const facts = productFacts(key);
  const copy = productCopy(key, locale); // official Spanish, or its machine-assisted en/ca version
  const lore = copy?.lore ?? [];
  const title = facts?.title ?? hit.title; // the official name, model count included: "Leva Demontre (3)"
  const info = page ? characterInfo(page) : null; // short official wiki text, never invented
  const isPack = key.startsWith("packs/");
  const element = elementFor(f.theme);

  const [products, ready] = await Promise.all([listSellableProducts(), shopReadiness()]);
  const product = productForMiniature(products, key);
  const own = product ? mediaUrl(product.image_path) : null;

  // Official photos with what each one shows, the cut-out first; then the wiki's own images (illustrations, renders) not already there.
  const owner = (ownerPhotos(key)?.gallery ?? []).map((g): GalleryPhoto => ({ src: g.src, alt: title, kind: kindOf(g.kind) }))
    .sort((a, b) => (ORDER.indexOf(a.kind!) + 9) % 9 - (ORDER.indexOf(b.kind!) + 9) % 9);
  // The wiki's own miniature renders are the same photo as the owner's cut-out: with one, only its illustrations are added.
  const hasCut = owner.some((o) => o.kind === "clean");
  const wikiExtra = page ? miniPhotos(page).filter((p) => !owner.some((o) => o.src === p.src) && (!hasCut || p.kind === "illustration")).map((p): GalleryPhoto => ({ src: p.src, alt: title, art: p.kind === "illustration", kind: p.kind === "illustration" ? "art" : "photo" })) : [];
  const official = [...owner, ...wikiExtra];
  // WooCommerce gallery first (only images hosted on the WooCommerce domain, which next/image is configured for), then the official ones.
  const wcHost = process.env.WC_API_URL ? new URL(process.env.WC_API_URL).hostname : null;
  const wooPhotos = (product?.images ?? []).filter((i) => { try { return i.src.startsWith("https://") && new URL(i.src).hostname === wcHost; } catch { return false; } });
  // The transparent cut-out always opens the gallery: it is the largest, cleanest view of the miniature. Then the WooCommerce photos
  // (the owner manages them there; the same file uploaded again is dropped), then the rest of the official set.
  const cutout = official.find((p) => p.kind === "clean");
  const base = (src: string) => src.split("/").pop()!.replace(/(-\d+x\d+|-scaled)?\.(webp|png|jpe?g)$/i, "").replace(/-\d+$/, "");
  const woo = [...(own ? [{ src: own, alt: product?.image_alt ?? title }] : []), ...wooPhotos].filter((p, i, all) => (!cutout || base(p.src) !== base(cutout.src)) && all.findIndex((q) => base(q.src) === base(p.src)) === i);
  const photos: GalleryPhoto[] = [...(cutout ? [cutout] : []), ...woo, ...(woo.length ? official.filter((p) => p.art) : official.filter((p) => p !== cutout))];

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

  // The Starter Pack is offered on a single's page when it is on sale.
  const pack = !isPack ? packFor(f.slug) : null;
  const packProduct = pack ? productForMiniature(products, pack.key) : null;
  const packPrice = pack && packProduct?.sellable && packProduct.stock !== 0 && ready.canCheckout ? formatPrice(packProduct.price_cents, packProduct.currency, locale) : null;
  const more = [
    ...(pack && packPrice ? [{ id: `pack-${pack.key}`, name: pack.title, href: `/${locale}/tienda/${f.slug}/starter-pack`, image: pack.image, price: packPrice, pack: true }] : []),
    ...related.map((r) => ({ ...r, pack: false })),
  ].slice(0, 4);

  const spec = (...labels: string[]) => facts?.specs.find((x) => labels.includes(x.label))?.value ?? null;
  const models = spec("Número de miniaturas") ?? (facts?.models ? String(facts.models) : null);
  const life = spec("Dado de Vida", "Dados de Vida");
  const num = (v: string | null) => (v ? localNum(v, locale, t) : null);
  const strip = ([
    [s.factPoints, num(spec("Puntos de Banda"))],
    [s.factHeight, num(spec("Altura"))],
    [s.factBase, num(spec("Peana"))],
    [life && Number(life) > 1 ? d.lives : d.life, life],
    [s.factModels, isPack || (facts?.models ?? 0) > 1 ? models : null],
    [d.sub, spec("Subfacción"), "es"],
  ] as [string, string | null, string?][]).filter((c): c is [string, string, string?] => Boolean(c[1]));
  const estado = spec("Estado");
  const extraSpecs = (facts?.specs ?? []).filter((x) => !SHOWN.has(x.label));
  const need = [[Dice6, s.needDice], [Ruler, s.needTape], [Layers, s.needCounters], [Mountain, s.needScenery]] as const;
  const figures = isPack ? [] : lineup(f, key, locale, t);
  const items = isPack ? (facts?.items ?? []).map((i) => packItem(f.slug, i, locale, t)) : [];
  const art = page ? characterArt(page.slug) : null;
  const cut = photos[0]?.kind === "clean" ? photos[0].src : null;
  const excerpt = lore[0] ?? null;
  const h2 = "font-display text-3xl text-ivory md:text-4xl";

  return (
    <div data-faction={f.theme}>
      <section className="pdp-hero">
        <div className="pdp-atmo" aria-hidden>
          {/* Blurred backdrop: low priority, so the product photo (first gallery image, priority) is fetched first. */}
          <Image src={`/facciones/${f.slug}.webp`} alt="" fill fetchPriority="low" loading="eager" sizes="(min-width:1024px) 60vw, 50vw" className="pdp-atmo-img" />
        </div>
        {/* Its pause button must stay reachable, so the video sits between the still frame and the veil, outside the hidden layers. */}
        <AmbientVideo src={`/facciones/${f.slug}.mp4`} pauseLabel={t.a11y.pauseVideo} playLabel={t.a11y.playVideo} />
        <div className="pdp-atmo" aria-hidden>
          <div className="pdp-veil" />
          {element && <ElementCanvas element={element} density={0.45} />}
        </div>

        <div className="relative mx-auto max-w-7xl px-4">
          <nav aria-label="breadcrumb" className="pt-5 text-sm text-stone max-lg:hidden">
            <Link href={`/${locale}/tienda`} className="hover:text-gold">{s.title}</Link> / <Link href={`/${locale}/tienda/${f.slug}`} className="hover:text-gold">{f.name}</Link>
          </nav>

          <div className="grid grid-cols-[minmax(0,1fr)] gap-x-12 gap-y-3 pb-6 pt-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] lg:items-center lg:pb-8 lg:pt-2">
            <div data-wp-slot="gallery" className="-mx-4 sm:mx-0">
              {photos.length > 0 ? (
                <ProductGallery photos={photos} labels={{ prev: s.prevPhoto, next: s.nextPhoto, zoom: s.zoomIn, zoomToggle: s.zoomToggle, close: t.a11y.close, photoOf: s.photoOf, gallery: s.gallery, kinds: d.kinds }} />
              ) : (
                <div className="grid place-items-center text-center max-lg:h-[36svh] max-lg:min-h-52 lg:h-[min(56svh,36rem)]">
                  <div><span className="block font-display text-8xl text-accent/40" aria-hidden>{title.charAt(0)}</span><span className="mt-2 block font-display text-base text-stone">{t.common.provisional}</span></div>
                </div>
              )}
            </div>

            <div className="lg:py-6">
              <h1 lang="es" className="font-display text-[2rem] leading-[1.08] text-ivory md:text-5xl lg:text-6xl">{title}</h1>
              <p className="mt-2 lg:mt-3">
                <Link href={`/${locale}/tienda/${f.slug}`} className="inline-flex min-h-8 items-center gap-2 font-display text-lg text-accent underline-offset-4 hover:underline">
                  <Image src={`/brand/factions/${f.slug}.webp`} alt="" width={28} height={30} className="h-7 w-auto" />{f.name}
                </Link>
              </p>

              <div data-wp-slot="buy" className="mt-3 lg:mt-7">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  {price && (
                    <p className="flex flex-wrap items-baseline gap-x-3">
                      <span className="font-display text-4xl leading-none text-gold tabular-nums lg:text-5xl">{price}</span>
                      {regular && <span className="text-lg text-stone tabular-nums"><span className="sr-only">{s.regularPrice}: </span><s>{regular}</s></span>}
                      <span className="text-sm text-stone">{s.taxIncluded}</span>
                    </p>
                  )}
                  <p className={`flex items-center gap-2 text-base ${canBuy ? "text-ivory" : "text-stone"}`}>
                    <span aria-hidden className={`size-2 ${canBuy ? "bg-gold shadow-[0_0_10px_var(--gold)]" : "border border-stone"}`} />{status}
                  </p>
                </div>
                {!priced && <p className="mt-1 text-sm text-stone">{s.pricePending}</p>}

                <div className="mt-4 lg:mt-6">
                  {canBuy && product ? (
                    <BuyBox locale={locale} related={related}
                      item={{ id: product.id, slug: product.slug, name: title, price_cents: product.price_cents!, image: cut ?? photos[0]?.src ?? null, stock: product.stock }}
                      labels={{ qty: s.qty, add: s.add, added: s.added, buyNow: s.buyNow, viewCart: s.viewCart, soldOut: s.soldOut, qtyLess: s.qtyLess, qtyMore: s.qtyMore }} />
                  ) : (
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 max-sm:[&>a:first-child]:w-full max-sm:[&>a:first-child]:justify-center">
                      <Button href={links.rules} external>{s.downloadRules}</Button>
                      <Link href={`/${locale}/tienda/${f.slug}`} className="inline-flex min-h-11 items-center font-display text-base text-gold underline-offset-4 hover:underline">{s.moreOfFaction.replace("{faction}", f.name)}</Link>
                    </div>
                  )}
                </div>
                {canBuy && ready.addressAtCheckout && <p className="mt-4 text-sm text-stone">{shippingInfoText(s.shippingInfo, locale)}</p>}
              </div>
              {estado && <p className="mt-1 text-sm text-stone">{/sin montar/i.test(estado) ? s.unassembled : <span lang="es">{estado}</span>}</p>}
            </div>
          </div>
        </div>

        {strip.length > 0 && (
          <div className="relative mx-auto max-w-7xl px-4 pb-2 max-sm:px-0">
            <dl className="pdp-facts">
              {strip.map(([label, value, lang]) => (
                <div key={label}>
                  <dt className="text-sm text-stone">{label}</dt>
                  <dd lang={lang} className="font-display text-2xl leading-tight text-gold tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </section>

      <div className="mx-auto max-w-7xl space-y-16 px-4 pb-16 pt-12 lg:space-y-24 lg:pb-24 lg:pt-16">
        {isPack && items.length > 0 && (
          <section aria-labelledby="pdp-box">
            <h2 id="pdp-box" className={h2}>{d.packTitle}</h2>
            <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {items.map((i) => {
                const body = (
                  <>
                    <span className={`relative block aspect-square ${i.cut ? "spot" : "bg-coal"}`}>
                      {i.image && <Image src={i.image} alt="" fill sizes="(min-width:1024px) 22vw, 45vw" loading="lazy" className={`object-contain ${i.cut ? "p-4 pdp-cut" : ""}`} />}
                    </span>
                    <span lang="es" className="block px-3 pt-3 font-display text-lg leading-tight group-hover:text-accent">{i.label}</span>
                    {i.height && <span className="block px-3 pb-3 pt-1 text-sm text-stone">{s.factHeight}: <span className="tabular-nums">{i.height}</span></span>}
                  </>
                );
                return (
                  <li key={i.label}>
                    {i.href
                      ? <Link href={i.href} className="tilt-card group block h-full border border-accent/25 bg-coal">{body}</Link>
                      : <div className="h-full border border-accent/25 bg-coal">{body}</div>}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {figures.length > 1 && (
          <section aria-labelledby="pdp-scale" className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:items-start">
            <div>
              <h2 id="pdp-scale" className={h2}>{d.scaleTitle}</h2>
              <p className="mt-3 max-w-[46ch] text-base text-ivory/85">{d.scaleLead.replace("{faction}", f.name)}</p>
              <p className="mt-2 text-sm text-stone">{d.scaleGrid}</p>
              {/* A plain link (full load), so the miniature is the :target there and stands highlighted in the lineup. */}
              <a href={`${scaleHref(locale, null)}#${scaleAnchor(key)}`} className="shop-arrow-link mt-3">{t.scale.entry}<ArrowRight size={18} aria-hidden /></a>
            </div>
            <ScaleLineup figures={figures} label={d.scaleLabel.replace("{list}", figures.map((x) => `${x.name} ${x.heightText}`).join(", "))} />
          </section>
        )}

        {(facts || info?.excerpt) && (
          <section aria-labelledby="pdp-lore" className={`grid gap-8 ${art ? "lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-14" : ""}`}>
            <div>
              <h2 id="pdp-lore" className={h2}>{d.loreTitle}</h2>
              <div lang={copy?.lang ?? "es"} className="mt-4 max-w-[68ch] space-y-4 text-base leading-relaxed text-ivory/85">
                <p>{copy?.intro ?? info?.excerpt}</p>
                {excerpt && <p className="border-l border-accent/50 pl-4 font-display text-lg leading-relaxed text-ivory">{excerpt}</p>}
                {!facts && info?.race && <p lang={locale} className="text-accent">{t.factions.raceLabel}: <span lang="es">{info.race}</span></p>}
              </div>
              {page && <p className="mt-5"><Link href={`/${locale}/wikisphere/${page.slug}`} className="shop-arrow-link text-lg">{d.readWiki}<ArrowRight size={18} aria-hidden /></Link></p>}
              {extraSpecs.length > 0 && (
                <dl className="mt-6 max-w-[68ch] divide-y divide-gold/15 border-y border-gold/15 text-base">
                  {extraSpecs.map((x) => { const sp = specText(x, locale); return (
                    <div key={x.label} className="grid grid-cols-[8.5rem_1fr] gap-3 py-2.5"><dt lang={sp.labelLang} className="text-stone">{sp.label}</dt><dd lang={sp.valueLang}>{sp.value}</dd></div>
                  ); })}
                </dl>
              )}
            </div>
            {art && (
              <div className={`relative mx-auto w-full max-w-md self-start border border-accent/25 ${art.bg === "light" ? "bg-ivory" : "spot"}`}>
                <Image src={art.src} alt={title} width={art.w} height={art.h} sizes="(min-width:1024px) 28rem, 90vw" loading="lazy" className={`h-auto w-full ${art.bg === "light" ? "mix-blend-multiply" : ""}`} />
              </div>
            )}
          </section>
        )}

        <section aria-labelledby="pdp-need">
          <h2 id="pdp-need" className={h2}>{s.needTitle}</h2>
          <ul className="mt-6 grid grid-cols-1 border-y border-gold/20 sm:grid-cols-2 lg:grid-cols-5">
            {need.map(([Icon, label]) => (
              <li key={label} className="flex items-center gap-3 border-gold/15 py-3 max-sm:border-b sm:px-4 sm:py-5 lg:border-l lg:first:border-l-0 lg:first:pl-0"><Icon size={22} aria-hidden className="shrink-0 text-gold" />{label}</li>
            ))}
            <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 sm:px-4 sm:py-5 lg:border-l lg:border-gold/15">
              <span className="flex items-center gap-3"><FileText size={22} aria-hidden className="shrink-0 text-gold" />{s.needRules}</span>
              <a href={links.rules} rel="noopener" className="ml-[2.125rem] inline-flex min-h-6 items-center text-gold underline underline-offset-4 hover:text-ivory">{s.needRulesLink}</a>
            </li>
          </ul>
        </section>

        {more.length > 0 && (
          <section aria-labelledby="pdp-more">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
              <h2 id="pdp-more" className={h2}>{s.crossTitle}</h2>
              <Link href={`/${locale}/tienda/${f.slug}`} className="shop-arrow-link">{d.seeAll.replace("{faction}", f.name)}<ArrowRight size={18} aria-hidden /></Link>
            </div>
            <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {more.map((r) => (
                <li key={r.id}>
                  <Link href={r.href} className="tilt-card group flex h-full flex-col border border-accent/25 bg-coal">
                    <span className="spot relative block aspect-square">
                      {r.image && <Image src={r.image} alt="" fill sizes="(min-width:1024px) 22vw, 45vw" loading="lazy" className={`object-contain ${r.pack ? "p-2" : "p-4 pdp-cut"}`} />}
                    </span>
                    <span lang="es" className="block px-3 pt-3 font-display text-lg leading-tight group-hover:text-accent">{r.name}</span>
                    {r.pack && <span className="block px-3 pt-1 text-sm text-stone">{d.starterLead.replace("{faction}", f.name)}</span>}
                    <span className="mt-auto block px-3 pb-3 pt-2 font-display text-lg text-gold tabular-nums">{r.price}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

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
