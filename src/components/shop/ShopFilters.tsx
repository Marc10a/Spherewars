import Link from "next/link";
import { dict, type Locale } from "@/lib/i18n";
import { factions } from "@/content/factions";

/** Faction filter chips shared by the shop home and the faction pages. */
export function ShopFilters({ locale, active }: { locale: Locale; active: string | null }) {
  const t = dict[locale].shop;
  const chip = (on: boolean) => `btn inline-flex min-h-11 items-center border px-4 font-display text-sm font-semibold ${on ? "border-gold bg-gold text-abyss" : "border-gold/50 text-ivory hover:border-gold hover:bg-gold/15"}`;
  return (
    <nav aria-label={t.factionsTitle} className="mt-6 flex flex-wrap gap-2">
      <Link href={`/${locale}/tienda`} aria-current={active === null ? "page" : undefined} className={chip(active === null)}>{t.allShop}</Link>
      {factions.map((f) => (
        <Link key={f.slug} href={`/${locale}/tienda/${f.slug}`} aria-current={active === f.slug ? "page" : undefined} className={chip(active === f.slug)}>{f.name}</Link>
      ))}
    </nav>
  );
}
