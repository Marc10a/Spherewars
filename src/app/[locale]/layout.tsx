import type { Metadata } from "next";
import { abaddon, cinzel, inter } from "@/lib/fonts";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import "../globals.css";
import { dict, isLocale, locales, ogLocale } from "@/lib/i18n";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { RevealObserver } from "@/components/Reveal";
import { jsonLd, siteUrl } from "@/lib/seo";


const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const generateStaticParams = () => locales.map((locale) => ({ locale }));

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    metadataBase: new URL(base),
    title: { default: "SphereWars: Otro Mundo", template: "%s · SphereWars" },
    description: dict[isLocale(locale) ? locale : "es"].meta.description,
    openGraph: { title: "SphereWars: Otro Mundo", siteName: "SphereWars", type: "website", locale: ogLocale[isLocale(locale) ? locale : "es"], images: [{ url: "/og.jpg", width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image" },
    icons: { icon: "/brand/logo.jpeg", apple: "/brand/logo.jpeg" },
    manifest: "/manifest.webmanifest",
  };
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dict[locale];
  return (
    <html lang={locale} className={`${cinzel.variable} ${inter.variable} ${abaddon.variable}`}>
      <body className="min-h-screen antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-gold focus:px-4 focus:py-2 focus:text-abyss">
          {t.common.skip}
        </a>
        <Suspense fallback={null}><Header locale={locale} /></Suspense>
        <main id="main">{children}</main>
        <Footer locale={locale} />
        <Suspense fallback={null}><RevealObserver /></Suspense>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd({
            "@context": "https://schema.org",
            "@graph": [
              { "@type": "Organization", name: "SphereWars", url: siteUrl, logo: `${siteUrl}/brand/logo.jpeg`, sameAs: ["https://www.instagram.com/spherewarsgames", "https://www.youtube.com/@spherewars", "https://discord.gg/jUmGmpWPDb"] },
              { "@type": "WebSite", name: "SphereWars: Otro Mundo", url: siteUrl, inLanguage: locale, potentialAction: { "@type": "SearchAction", target: `${siteUrl}/${locale}/buscar?q={search_term_string}`, "query-input": "required name=search_term_string" } },
            ],
          }) }}
        />
      </body>
    </html>
  );
}
