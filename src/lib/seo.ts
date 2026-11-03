import type { Metadata } from "next";
import { dict, isLocale, locales, ogLocale, type Dict, type Locale } from "@/lib/i18n";

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
export const defaultOg = "/og.jpg";

/** Canonical + hreflang alternates for a locale-less path ("" = home). */
export function alternates(locale: string, path: string): Metadata["alternates"] {
  const l = isLocale(locale) ? locale : "es";
  return {
    canonical: `/${l}${path}`,
    languages: { ...Object.fromEntries(locales.map((x) => [x, `/${x}${path}`])), "x-default": `/es${path}` },
  };
}

type MetaOpts = { title?: string | ((t: Dict) => string); description?: string | ((t: Dict) => string); path: string; image?: string; noindex?: boolean; canonicalLocale?: Locale };

export function pageMeta(o: MetaOpts, localeParam: string): Metadata {
  const locale: Locale = isLocale(localeParam) ? localeParam : "es";
  const t = dict[locale];
  const resolve = (v?: string | ((t: Dict) => string)) => (typeof v === "function" ? v(t) : v);
  const title = resolve(o.title);
  const image = o.image ?? defaultOg;
  const description = resolve(o.description) || t.meta.description;
  return {
    title,
    description,
    alternates: o.canonicalLocale ? { canonical: `/${o.canonicalLocale}${o.path}` } : alternates(locale, o.path),
    robots: o.noindex ? { index: false, follow: true } : undefined,
    openGraph: { title: title ? `${title} · SphereWars` : "SphereWars: Otro Mundo", description, images: [{ url: image }], type: "website", siteName: "SphereWars", locale: ogLocale[locale] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

/** For static pages: `export const generateMetadata = staticMeta({ title: "Eventos", path: "/eventos" })`. */
export const staticMeta = (o: MetaOpts) =>
  async ({ params }: { params: Promise<{ locale: string }> }) => pageMeta(o, (await params).locale);

export const jsonLd = (data: object) => JSON.stringify(data).replace(/</g, "\\u003c");
