"use client";

import { usePathname } from "next/navigation";
import { dict, isLocale } from "@/lib/i18n";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const first = usePathname().split("/")[1] ?? "";
  const t = dict[isLocale(first) ? first : "es"].error;
  return (
    <div className="grid min-h-[50vh] place-items-center px-4 py-24 text-center">
      <div>
        <h1 className="font-display text-3xl">{t.title}</h1>
        <p className="mt-3 text-stone">{t.text}</p>
        <button onClick={reset} className="mt-8 bg-gold px-6 py-3 font-display text-sm font-semibold text-abyss">{t.retry}</button>
      </div>
    </div>
  );
}
