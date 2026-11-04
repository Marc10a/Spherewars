import Link from "next/link";
import { notFound } from "next/navigation";
import { dict, isLocale } from "@/lib/i18n";
import { oneParam } from "@/lib/params";
import { pageMeta } from "@/lib/seo";
import { isConfigured, supabaseServer } from "@/lib/supabase/server";
import { wooOrderReturn } from "@/lib/woo";
import { PageHero } from "@/components/ui";
import { ClearCart } from "@/components/shop/ClearCart";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return pageMeta({ title: (t) => t.shop.thanksTitle, path: "/tienda/gracias", noindex: true }, locale);
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

  return (
    <>
      <PageHero title={title} />
      <div className="mx-auto max-w-7xl px-4 py-12 md:py-16">
        {paid && <ClearCart order={woo ? `woo-${wc_order}` : `order-${number}`} />}
        <p role={paid ? undefined : "status"} className="max-w-[60ch] text-lg text-ivory/90">{text}</p>
        {paid && <p className="mt-6 font-display text-3xl text-gold">{t.thanksOrder} {number}</p>}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={`/${locale}/tienda`} className="btn inline-flex min-h-12 items-center bg-gold px-6 py-3 font-display text-base tracking-[0.03em] text-abyss hover:bg-ivory">{t.backToShop}</Link>
        </div>
      </div>
    </>
  );
}
