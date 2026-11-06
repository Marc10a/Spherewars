"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dict, isLocale } from "@/lib/i18n";

export default function NotFound() {
  const first = usePathname().split("/")[1] ?? "";
  const locale = isLocale(first) ? first : "es";
  const t = dict[locale];
  return (
    <div className="relative grid min-h-[60vh] place-items-center overflow-hidden px-4 py-24 text-center">
      {/* A client component cannot export metadata: React hoists this title into <head>. */}
      <title>{`${t.notFound.short} · SphereWars`}</title>
      <div className="mist absolute inset-0" aria-hidden />
      <div className="relative">
        <p className="font-display text-7xl text-gold" aria-hidden>404</p>
        <h1 className="mt-4 font-display text-3xl">{t.notFound.title}</h1>
        <p className="mx-auto mt-3 max-w-md text-stone">{t.notFound.text}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href={`/${locale}`} className="btn inline-flex min-h-12 items-center bg-gold px-6 font-display text-base text-abyss hover:bg-ivory">{t.notFound.home}</Link>
          <Link href={`/${locale}/tienda`} className="btn inline-flex min-h-12 items-center border border-gold/60 px-6 font-display text-base text-gold hover:bg-gold/10">{t.nav.shop}</Link>
          <Link href={`/${locale}/wikisphere`} className="btn inline-flex min-h-12 items-center border border-gold/60 px-6 font-display text-base text-gold hover:bg-gold/10">WikiSphere</Link>
        </div>
      </div>
    </div>
  );
}
