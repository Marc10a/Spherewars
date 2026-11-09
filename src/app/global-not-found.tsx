import "./globals.css";
import { federo, inter } from "@/lib/fonts";
import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { activeLocales, dict, localeNames } from "@/lib/i18n";

export const metadata: Metadata = { title: `${dict.es.notFound.short} · SphereWars`, description: dict.es.notFound.text, robots: { index: false } };

// URLs outside every language bypass the layout (URLs under /es, /en or /ca get the in-layout 404 instead), so this page has its own
// brand bar and offers home and shop in all three languages.
export default function GlobalNotFound() {
  return (
    <html lang="es" className={`${federo.variable} ${inter.variable}`}>
      <body className="flex min-h-screen flex-col bg-abyss text-ivory antialiased">
        <header className="border-b border-gold/20 bg-abyss/95">
          <div className="mx-auto flex h-16 max-w-7xl items-center px-4">
            <Link href="/es" className="text-3xl text-gold" aria-label="SphereWars"><Wordmark className="wordmark-wide ember-text" /></Link>
          </div>
        </header>
        <main className="relative grid flex-1 place-items-center overflow-hidden px-4 py-20 text-center">
          <div className="mist absolute inset-0" aria-hidden />
          <div className="relative">
            <p className="font-display text-7xl text-gold" aria-hidden>404</p>
            <h1 className="mt-4 font-display text-3xl">{dict.es.notFound.title}</h1>
            <p className="mx-auto mt-3 max-w-md text-stone">{dict.es.notFound.text}</p>
            <ul className="mx-auto mt-10 grid max-w-xl gap-6 sm:grid-cols-3">
              {activeLocales.map((l) => (
                <li key={l} lang={l} className="flex flex-col items-center gap-3">
                  <span className="font-display text-base text-stone">{localeNames[l]}</span>
                  <Link href={`/${l}`} hrefLang={l} className="btn inline-flex min-h-12 w-full items-center justify-center bg-gold px-5 font-display text-base text-abyss hover:bg-ivory">{dict[l].notFound.home}</Link>
                  <Link href={`/${l}/tienda`} hrefLang={l} className="btn inline-flex min-h-12 w-full items-center justify-center border border-gold/60 px-5 font-display text-base text-gold hover:bg-gold/10">{dict[l].nav.shop}</Link>
                </li>
              ))}
            </ul>
          </div>
        </main>
      </body>
    </html>
  );
}
