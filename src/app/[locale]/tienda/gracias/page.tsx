import Link from "next/link";
import { notFound } from "next/navigation";
import { dict, isLocale } from "@/lib/i18n";
import { oneParam } from "@/lib/params";
import { pageMeta } from "@/lib/seo";
import { isConfigured, supabaseServer } from "@/lib/supabase/server";
import { wooOrderReturn } from "@/lib/woo";
import { links } from "@/content/site";
import { ClearCart } from "@/components/shop/ClearCart";
import { CheckoutSteps } from "@/components/shop/CheckoutSteps";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return pageMeta({ title: (t) => t.shop.thanksTitle, description: (t) => t.pageMeta.thanks, path: "/tienda/gracias", noindex: true }, locale);
}

export default async function Page({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ session_id?: string | string[]; wc_order?: string | string[]; wc_key?: string | string[] }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dict[locale].shop;
  const query = await searchParams;
  const [session_id, wc_order, wc_key] = [oneParam(query.session_id), oneParam(query.wc_order), oneParam(query.wc_key)];

  // The order is confirmed by the payment webhook, never by this URL. We only look it up (by the unguessable session id).
  let order: { number: number | string; status: string } | null = null;
  if (session_id && /^cs_[A-Za-z0-9_]+$/.test(session_id) && isConfigured()) {
    const sb = await supabaseServer();
    const { data } = await sb.rpc("order_by_session", { p_session: session_id });
    const row = Array.isArray(data) ? data[0] : null;
    if (row) order = { number: Number(row.number), status: row.status };
  }
  // Back from WooCommerce: its order, read with its key. The URL itself proves nothing.
  const woo = wc_order && wc_key ? await wooOrderReturn(wc_order, wc_key) : null;
  const paid = woo ? woo.paid : order?.status === "paid" || order?.status === "shipped";
  const number = woo ? woo.number : order?.number;
  // "Confirming" is said only of an order that was really found and can still be paid. No order found: nothing about one is stated.
  const status = woo ? woo.status : order?.status;
  const dead = status === "cancelled" || status === "failed" || status === "refunded";
  const pending = Boolean(status) && !paid && !dead;
  const title = paid ? t.thanksTitle : pending ? t.thanksPendingTitle : t.thanksNeutralTitle;
  const text = paid ? t.thanksText : pending ? t.thanksPendingText : dead ? t.cancelled : t.thanksNeutralText;

  const found = paid || Boolean(woo && pending); // an order of this buyer exists: it is step 3 of the purchase
  const btn = "btn inline-flex min-h-12 items-center justify-center px-6 py-3 font-display text-base tracking-[0.03em]";

  return (
    <>
      <div className="border-b border-gold/25 bg-coal">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-x-8 gap-y-5 px-4 py-6 md:py-8">
          <h1 className="font-display text-4xl tracking-wide text-ivory md:text-5xl">{title}</h1>
          {found && <CheckoutSteps current={3} labels={{ label: t.stepsLabel, cart: t.stepCart, pay: t.stepPay, done: t.stepDone }} />}
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-10 md:py-14">
        {/* The order exists, so this cart has been bought even if its payment is still confirming (bank transfer, a delayed gateway). */}
        {found && <ClearCart order={woo ? `woo-${wc_order}` : `order-${number}`} />}
        <div className="max-w-2xl">
          {found && (
            <p className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-y border-gold/30 py-4">
              <span className="font-display text-lg text-stone">{t.thanksOrder}</span>
              <span className="font-display text-4xl text-gold tabular-nums">{number}</span>
            </p>
          )}
          <p role={paid ? undefined : "status"} className={`max-w-[60ch] text-lg text-ivory/90 ${found ? "mt-6" : ""}`}>{text}</p>
          {paid && <p className="mt-2 max-w-[60ch] text-base text-ivory/80">{t.thanksEmail}</p>}
          {found && <p className="mt-2 max-w-[60ch] text-base text-ivory/80">{t.thanksHelp} <Link href={`/${locale}/comunidad#contacto`} className="text-gold underline underline-offset-4 hover:text-ivory">{t.thanksContact}</Link></p>}
          <div className="mt-8 flex flex-wrap gap-3 max-sm:[&>a]:w-full">
            <Link href={`/${locale}/tienda`} className={`${btn} bg-gold text-abyss hover:bg-ivory`}>{t.backToShop}</Link>
            {paid && <a href={links.rules} rel="noopener" className={`${btn} border border-gold/70 text-ivory hover:border-gold hover:bg-gold/15`}>{t.downloadRules}</a>}
          </div>
        </div>
      </div>
    </>
  );
}
