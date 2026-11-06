import { notFound } from "next/navigation";
import { dict, isLocale } from "@/lib/i18n";
import { oneParam } from "@/lib/params";
import { pageMeta } from "@/lib/seo";
import { shopReadiness } from "@/lib/shop/settings";
import { cancelAbandonedCheckout } from "@/lib/shop/cancel";
import { listSellableProducts, type Product } from "@/lib/data";
import { factionCharacters } from "@/lib/wiki";
import { CartView, type LiveProduct } from "@/components/shop/CartView";
import { CheckoutSteps } from "@/components/shop/CheckoutSteps";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return pageMeta({ title: (t) => t.shop.cart, description: (t) => t.pageMeta.cart, path: "/tienda/carrito", noindex: true }, locale);
}

/** The product's /tienda page: its wiki miniature or Starter Pack if it has one, otherwise its faction's shop or the shop itself. */
function shopHref(p: Product, locale: string) {
  const faction = p.factions?.slug;
  if (!faction) return `/${locale}/tienda`;
  if (p.wiki_slug?.startsWith("packs/")) return `/${locale}/tienda/${faction}/starter-pack`;
  const mini = (p.wiki_slug ?? p.slug).split("/").pop()!;
  return factionCharacters(faction).some((m) => m.slug.split("/").pop() === mini) ? `/${locale}/tienda/${faction}/${mini}` : `/${locale}/tienda/${faction}`;
}

export default async function Page({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ e?: string | string[]; o?: string | string[]; line?: string | string[] }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dict[locale].shop;
  const query = await searchParams;
  const [e, o, line] = [oneParam(query.e), oneParam(query.o), oneParam(query.line)];
  if (e === "cancelled" && o) await cancelAbandonedCheckout(o); // back from the payment page: free the customer's own reservation at once
  const [ready, products] = await Promise.all([shopReadiness(), listSellableProducts()]);
  const notice = e === "cancelled" ? t.cancelled : e ? (Object.hasOwn(t.errors, e) ? t.errors[e] : t.errors.generic) : null;

  // An empty list means the catalogue is unreachable, not that everything stopped being sold: flag nothing in that case.
  const live: Record<string, LiveProduct> | null = products.length === 0 ? null : Object.fromEntries(products.flatMap((p) => (
    p.sellable && p.price_cents && p.price_cents > 0 ? [[p.id, { price_cents: p.price_cents, stock: p.stock, href: shopHref(p, locale) }]] : []
  )));

  // The shop's own address, said before the buyer is sent there (tienda.spherewars.com in production).
  let checkoutHost: string | null = null;
  try { checkoutHost = ready.addressAtCheckout && process.env.WC_API_URL ? new URL(process.env.WC_API_URL).host : null; } catch { /* no address: the generic note is shown */ }

  return (
    <>
      <div className="border-b border-gold/25 bg-coal">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-x-8 gap-y-5 px-4 py-6 md:py-8">
          <h1 className="font-display text-4xl tracking-wide text-ivory md:text-5xl">{t.cart}</h1>
          {ready.canCheckout && <CheckoutSteps current={1} labels={{ label: t.stepsLabel, cart: t.stepCart, pay: t.stepPay, done: t.stepDone }} />}
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-10 lg:max-w-7xl">
        <CartView locale={locale} settings={ready.settings} canCheckout={ready.canCheckout} addressAtCheckout={ready.addressAtCheckout} checkoutHost={checkoutHost} labels={t} notice={notice} live={live} failedLine={e && e !== "cancelled" && line && /^[0-9]{1,12}$/.test(line) ? line : null} />
      </div>
    </>
  );
}
