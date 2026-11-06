"use client";

import { Wordmark } from "@/components/Wordmark";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, Search, X } from "lucide-react";
import { dict, localeNames, locales, type Locale } from "@/lib/i18n";
import { CartLink } from "@/components/shop/CartLink";
import { AddConfirm } from "@/components/shop/AddConfirm";

const items = [
  ["home", ""], ["game", "/juego"], ["factions", "/facciones"], ["wiki", "/wikisphere"], ["minis", "/miniaturas"],
  ["builder", "/genera-tu-banda"], ["events", "/eventos"], ["community", "/comunidad"],
] as const;

const quick = [["game", "/juego"], ["factions", "/facciones"], ["wiki", "/wikisphere"], ["events", "/eventos"], ["community", "/comunidad"]] as const;

export function Header({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false);
  const bar = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const t = dict[locale].nav;
  const a = dict[locale].a11y;
  const s = dict[locale].shop;
  const rest = pathname.replace(/^\/(es|en|ca)(?=\/|$)/, "");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: PointerEvent) => { if (!bar.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onDown); };
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
    <>
    <header ref={bar} className="sticky top-0 z-40 border-b border-gold/25 bg-abyss">
      <nav aria-label={a.mainNav} className="mx-auto flex max-w-[90rem] items-center justify-between gap-4 px-4 py-2">
        <Link href={`/${locale}`} className="flex shrink-0 items-center gap-2 sm:gap-3" onClick={() => setOpen(false)}>
          <Image src="/brand/logo.jpeg" alt="" width={44} height={44} priority className="rounded-full ring-1 ring-gold/60 max-sm:size-9" />
          <span className="text-xl text-gold sm:text-2xl"><Wordmark className="wordmark-wide" /></span>
          <span className="sr-only">{a.home}</span>
        </Link>

        <ul className="hidden items-center gap-6 font-display text-lg tracking-wide text-ivory xl:flex">
          {quick.map(([k, href]) => (
            <li key={k}><Link href={`/${locale}${href}`} aria-current={rest === href || rest.startsWith(`${href}/`) ? "page" : undefined} className="hover:text-gold aria-[current=page]:text-gold">{t[k]}</Link></li>
          ))}
        </ul>

        <div className="flex items-center gap-2 sm:gap-4">
          {switcher("hidden items-center gap-3 text-sm sm:flex")}
          <Link href={`/${locale}/tienda`} aria-current={rest === "/tienda" || rest.startsWith("/tienda/") ? "page" : undefined} className="btn hidden min-h-10 items-center border border-gold/70 px-4 font-display text-base text-ivory hover:bg-gold/15 aria-[current=page]:border-gold aria-[current=page]:text-gold sm:inline-flex">{t.shop}</Link>
          <Link href={`/${locale}/tienda`} aria-current={rest === "/tienda" || rest.startsWith("/tienda/") ? "page" : undefined} className="hidden min-h-11 items-center font-display text-base text-ivory hover:text-gold aria-[current=page]:text-gold min-[23rem]:inline-flex sm:hidden">{t.shop}</Link>
          <CartLink locale={locale} label={a.cart} />
          <Link href={`/${locale}/buscar`} aria-label={a.search} className="-m-3 p-3 text-ivory/80 hover:text-gold"><Search size={20} /></Link>
          <Link href={`/${locale}/juega-gratis`} className="btn hidden min-h-10 items-center bg-gold px-4 font-display text-base text-abyss hover:bg-ivory md:inline-flex">
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
        /* Only what the bar is not showing at this width: nothing appears twice. */
        <div id="site-menu" className="absolute inset-x-0 top-full max-h-[calc(100svh-4rem)] overflow-y-auto border-b border-gold/30 bg-coal shadow-2xl xl:inset-x-auto xl:right-[max(1rem,calc((100vw-90rem)/2+1rem))] xl:w-64 xl:border">
          <ul className="mx-auto grid max-w-7xl grid-cols-2 gap-x-4 px-4 py-2 sm:grid-cols-3 xl:grid-cols-1 xl:py-1">
            {items.map(([k, href]) => (
              <li key={k} className={quick.some(([q]) => q === k) || k === "home" ? "xl:hidden" : ""}>
                <Link
                  onClick={() => setOpen(false)} href={`/${locale}${href}`}
                  aria-current={rest === href || (href === "" && rest === "") ? "page" : undefined}
                  className="flex min-h-11 items-center font-display text-lg hover:text-gold aria-[current=page]:text-gold"
                >
                  {t[k]}
                </Link>
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-2 gap-3 px-4 pb-3 sm:hidden">
            <Link onClick={() => setOpen(false)} href={`/${locale}/tienda`} className="btn flex min-h-11 items-center justify-center border border-gold font-display text-base text-gold hover:bg-gold/15 min-[23rem]:hidden">{t.shop}</Link>
            <Link onClick={() => setOpen(false)} href={`/${locale}/juega-gratis`} className="btn flex min-h-11 items-center justify-center bg-gold font-display text-base text-abyss min-[23rem]:col-span-2">{t.playFree}</Link>
          </div>
          <div className="px-4 pb-3 sm:hidden">{switcher("flex min-h-11 items-center gap-6 text-base")}</div>
          <div className="hidden px-4 pb-3 sm:block md:hidden"><Link onClick={() => setOpen(false)} href={`/${locale}/juega-gratis`} className="btn flex min-h-11 items-center justify-center bg-gold font-display text-base text-abyss">{t.playFree}</Link></div>
        </div>
      )}
    </header>
    <AddConfirm locale={locale} labels={{ added: s.added, close: a.close, subtotal: s.subtotal, viewCart: s.viewCart, continue: s.continue, crossTitle: s.crossTitle }} />
    </>
  );
}
