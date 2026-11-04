import { chipCls } from "@/components/ui";
import Link from "next/link";
import { dict, type Locale } from "@/lib/i18n";
import { factions } from "@/content/factions";

/** Faction filter chips shared by the shop home and the faction pages. */
export function ShopFilters({ locale, active }: { locale: Locale; active: string | null }) {
  const t = dict[locale].shop;
  const chip = chipCls;
  return (
    <nav aria-label={t.factionsTitle} className="mt-6 flex flex-wrap gap-2">
      <Link href={`/${locale}/tienda`} aria-current={active === null ? "page" : undefined} className={chip(active === null)}>{t.allShop}</Link>
      {factions.map((f) => (
        <Link key={f.slug} href={`/${locale}/tienda/${f.slug}`} aria-current={active === f.slug ? "page" : undefined} className={chip(active === f.slug)}>{f.name}</Link>
      ))}
    </nav>
  );
}
