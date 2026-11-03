import { notFound } from "next/navigation";
import { dict, isLocale } from "@/lib/i18n";
import { pageMeta } from "@/lib/seo";
import { shopReadiness } from "@/lib/shop/settings";
import { PageHero } from "@/components/ui";
import { CartView } from "@/components/shop/CartView";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return pageMeta({ title: (t) => t.shop.cart, path: "/tienda/carrito", noindex: true }, locale);
}

export default async function Page({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ e?: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dict[locale].shop;
  const { e } = await searchParams;
  const ready = await shopReadiness();
  const notice = e === "cancelled" ? t.cancelled : e ? t.errors[e] ?? t.errors.generic : null;

  return (
    <>
      <PageHero title={t.cart} />
      <div className="mx-auto max-w-6xl px-4 py-12">
        <CartView locale={locale} settings={ready.settings} canCheckout={ready.canCheckout} labels={t} notice={notice} />
      </div>
    </>
  );
}
