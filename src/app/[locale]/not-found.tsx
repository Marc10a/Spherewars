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
      <div className="mist absolute inset-0" aria-hidden />
      <div className="relative">
        <p className="font-display text-7xl text-gold">404</p>
        <h1 className="mt-4 font-display text-3xl">{t.notFound.title}</h1>
        <p className="mx-auto mt-3 max-w-md text-stone">{t.notFound.text}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href={`/${locale}`} className="bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-abyss">{t.notFound.home}</Link>
          <Link href={`/${locale}/wikisphere`} className="border border-gold/60 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold">WikiSphere</Link>
        </div>
      </div>
    </div>
  );
}
