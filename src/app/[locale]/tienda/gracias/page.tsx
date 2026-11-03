import Link from "next/link";
import { notFound } from "next/navigation";
import { dict, isLocale } from "@/lib/i18n";
import { pageMeta } from "@/lib/seo";
import { isConfigured, supabaseServer } from "@/lib/supabase/server";
import { PageHero } from "@/components/ui";
import { ClearCart } from "@/components/shop/ClearCart";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return pageMeta({ title: (t) => t.shop.thanksTitle, path: "/tienda/gracias", noindex: true }, locale);
}

export default async function Page({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ session_id?: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dict[locale].shop;
  const { session_id } = await searchParams;

  // The order is confirmed by the Stripe webhook, never by this URL. We only look it up (by the unguessable session id).
  let order: { number: number; status: string } | null = null;
  if (session_id && /^cs_[A-Za-z0-9_]+$/.test(session_id) && isConfigured()) {
    const sb = await supabaseServer();
    const { data } = await sb.rpc("order_by_session", { p_session: session_id });
    const row = Array.isArray(data) ? data[0] : null;
    if (row) order = { number: Number(row.number), status: row.status };
  }
  const paid = order?.status === "paid" || order?.status === "shipped";

  return (
    <>
      <PageHero title={paid ? t.thanksTitle : t.thanksPendingTitle} />
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        {paid ? (
          <>
            <ClearCart />
            <p className="text-lg text-ivory/90">{t.thanksText}</p>
            <p className="mt-6 font-display text-3xl text-gold">{t.thanksOrder} {order!.number}</p>
          </>
        ) : (
          <p role="status" className="text-lg text-ivory/90">{t.thanksPendingText}</p>
        )}
        <Link href={`/${locale}/tienda`} className="mt-10 inline-block bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-abyss">{t.backToShop}</Link>
      </div>
    </>
  );
}
