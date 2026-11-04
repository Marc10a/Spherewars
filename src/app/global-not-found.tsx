import "./globals.css";
import { federo, inter } from "@/lib/fonts";
import type { Metadata } from "next";
import { dict, localeNames, locales } from "@/lib/i18n";

export const metadata: Metadata = { title: "404 · SphereWars", robots: { index: false } };

// Unmatched URLs bypass the layout, so this page names all three languages and links to each.
export default function GlobalNotFound() {
  return (
    <html lang="es" className={`${federo.variable} ${inter.variable}`}>
      <body className="grid min-h-screen place-items-center px-4 text-center antialiased">
        <div>
          <p className="font-display text-7xl text-gold">404</p>
          {locales.map((l) => (
            <p key={l} lang={l} className="mt-3 text-stone">{dict[l].notFound.title}</p>
          ))}
          <p className="mt-8 flex flex-wrap justify-center gap-4">
            {locales.map((l) => (
              <a key={l} href={`/${l}`} hrefLang={l} lang={l} className="bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-abyss">{localeNames[l]}</a>
            ))}
          </p>
        </div>
      </body>
    </html>
  );
}
