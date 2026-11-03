import { notFound } from "next/navigation";
import { dict, isLocale } from "@/lib/i18n";
import { staticMeta } from "@/lib/seo";
import { links } from "@/content/site";
import { Button, PageHero, Pending, Section } from "@/components/ui";

export const generateMetadata = staticMeta({ title: (t) => t.community.title, description: (t) => t.community.lead, path: "/comunidad" });

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dict[locale];
  const c = t.community;
  const channels = [
    { name: "Discord", text: c.discord, href: links.discord },
    { name: "Instagram", text: c.instagram, href: links.instagram },
    { name: "YouTube", text: c.youtube, href: links.youtube },
  ];

  return (
    <>
      <PageHero title={c.title} lead={c.lead} />

      <Section title={c.join}>
        <ul className="grid gap-6 md:grid-cols-3">
          {channels.map((ch, i) => (
            <li key={ch.name} data-reveal data-delay={i + 1}>
              <a href={ch.href} rel="noopener" className="tilt-card block h-full border border-gold/25 bg-coal p-6">
                <h3 className="font-display text-2xl text-gold">{ch.name}</h3>
                <p className="mt-2 text-ivory/80">{ch.text}</p>
                <span className="mt-4 inline-block text-xs uppercase tracking-widest text-gold">{c.open}</span>
              </a>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={c.heralds}><Pending label={t.common.pendingLabel}>{c.heraldsPending}</Pending></Section>
      <Section title={c.gallery}><Pending label={t.common.pendingLabel}>{c.galleryPending}</Pending></Section>
      <div className="mx-auto max-w-7xl px-4 pb-16"><Button href={links.discord} external>{c.enterDiscord}</Button></div>
    </>
  );
}
