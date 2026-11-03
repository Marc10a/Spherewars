import { notFound } from "next/navigation";
import { staticMeta } from "@/lib/seo";
import { dict, isLocale } from "@/lib/i18n";
import { factions } from "@/content/factions";
import { FactionCard } from "@/components/FactionCard";
import { PageHero } from "@/components/ui";

export const generateMetadata = staticMeta({ title: (t) => t.factions.title, description: (t) => t.home.factionsLead, path: "/facciones" });

export default async function Factions({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <>
      <PageHero title={dict[locale].nav.factions} lead={dict[locale].home.factionsLead} />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-16 sm:grid-cols-2 lg:grid-cols-4">
        {factions.map((f) => <FactionCard key={f.slug} f={f} locale={locale} />)}
      </div>
    </>
  );
}
