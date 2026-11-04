import { notFound } from "next/navigation";
import { staticMeta } from "@/lib/seo";
import { dict, isLocale } from "@/lib/i18n";
import { factions } from "@/content/factions";
import { FactionChooser } from "@/components/faction/FactionChooser";

export const generateMetadata = staticMeta({ title: (t) => t.factions.title, description: (t) => t.home.factionsLead, path: "/facciones" });

export default async function Factions({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dict[locale];
  const items = factions.map((f) => ({ slug: f.slug, name: f.name, theme: f.theme, blurb: f.blurb[locale], style: f.style[locale] }));
  return <FactionChooser items={items} locale={locale} title={t.factions.chooseTitle} lead={t.home.factionsLead} cta={t.factions.chooseCta} />;
}
