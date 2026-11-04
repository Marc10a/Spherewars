"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Search, X } from "lucide-react";
import { dict, localeNames, locales, type Locale } from "@/lib/i18n";
import { CartLink } from "@/components/shop/CartLink";

const items = [
  ["home", ""], ["game", "/juego"], ["factions", "/facciones"], ["wiki", "/wikisphere"], ["minis", "/miniaturas"],
  ["builder", "/genera-tu-banda"], ["events", "/eventos"], ["community", "/comunidad"], ["shop", "/tienda"],
] as const;

export function Header({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const t = dict[locale].nav;
  const a = dict[locale].a11y;
  const rest = pathname.replace(/^\/(es|en|ca)(?=\/|$)/, "");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const switcher = (cls: string) => (
    <div role="group" aria-label={a.language} className={cls}>
      {locales.map((l) => (
        <Link
          key={l} href={`/${l}${rest}`} hrefLang={l} lang={l} onClick={() => setOpen(false)}
          aria-current={l === locale ? "true" : undefined} title={localeNames[l]}
          className={l === locale ? "text-gold" : "text-stone hover:text-ivory"}
        >
          {l.toUpperCase()}
        </Link>
      ))}
    </div>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-gold/20 bg-abyss/90 backdrop-blur">
      <nav aria-label={a.mainNav} className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2">
        <Link href={`/${locale}`} className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <Image src="/brand/logo.jpeg" alt="" width={44} height={44} priority className="rounded-full ring-1 ring-gold/60" />
          <span className="font-wordmark text-2xl tracking-[0.04em] text-gold">SphereWars</span>
          <span className="sr-only">{a.home}</span>
        </Link>

        <div className="flex items-center gap-4">
          {switcher("hidden items-center gap-3 text-xs sm:flex")}
          <CartLink locale={locale} label={a.cart} />
          <Link href={`/${locale}/buscar`} aria-label={a.search} className="text-ivory/80 hover:text-gold"><Search size={20} /></Link>
          <Link href={`/${locale}/juega-gratis`} className="hidden border border-gold bg-gold px-4 py-2 text-xs font-semibold uppercase tracking-widest text-abyss transition hover:bg-transparent hover:text-gold md:block">
            {t.playFree}
          </Link>
          <button
            aria-expanded={open} aria-controls="site-menu" aria-label={open ? a.closeMenu : a.openMenu}
            onClick={() => setOpen(!open)} className="p-2 text-ivory hover:text-gold"
          >
            {open ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </nav>

      {open && (
        <div id="site-menu" className="absolute inset-x-0 top-full max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-gold/30 bg-coal/98 shadow-2xl">
          <ul className="mx-auto grid max-w-7xl gap-1 px-4 py-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map(([k, href]) => (
              <li key={k}>
                <Link
                  onClick={() => setOpen(false)} href={`/${locale}${href}`}
                  aria-current={rest === href || (href === "" && rest === "") ? "page" : undefined}
                  className="block border-b border-gold/10 py-3 font-display text-xl uppercase tracking-wider hover:text-gold aria-[current=page]:text-gold"
                >
                  {t[k]}
                </Link>
              </li>
            ))}
            <li className="sm:col-span-2 lg:col-span-3">
              <Link onClick={() => setOpen(false)} href={`/${locale}/juega-gratis`} className="mt-3 block bg-gold py-3 text-center text-sm font-semibold uppercase tracking-widest text-abyss">{t.playFree}</Link>
            </li>
            <li className="pt-4 text-sm sm:col-span-2 lg:col-span-3">
              {switcher("flex gap-5")}
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
