import Link from "next/link";
import { staticMeta } from "@/lib/seo";
import { notFound } from "next/navigation";
import { dict, fmt, isLocale } from "@/lib/i18n";
import { listEvents, type EventRow } from "@/lib/data";
import { chipCls, PageHero, Pending } from "@/components/ui";

export const generateMetadata = staticMeta({ title: (t) => t.events.title, description: (t) => t.events.lead, path: "/eventos" });

export default async function Page({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ ciudad?: string; tipo?: string; pasados?: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dict[locale];
  const { ciudad, tipo, pasados } = await searchParams;
  const past = pasados === "1";
  const [events, all] = await Promise.all([listEvents({ past, city: ciudad, kind: tipo }), listEvents({ past })]);
  const cities = [...new Set(all.map((e) => e.city).filter(Boolean))] as string[];
  const href = (o: { ciudad?: string; tipo?: string; pasados?: boolean }) => {
    const qs = new URLSearchParams();
    if (o.ciudad) qs.set("ciudad", o.ciudad);
    if (o.tipo) qs.set("tipo", o.tipo);
    if (o.pasados) qs.set("pasados", "1");
    return `/${locale}/eventos${qs.size ? `?${qs}` : ""}`;
  };
  const chip = chipCls;

  // Agenda grouped by month (calendar view).
  const byMonth = new Map<string, EventRow[]>();
  for (const e of events) {
    const k = new Date(e.starts_at).toLocaleDateString(locale, { month: "long", year: "numeric" });
    byMonth.set(k, [...(byMonth.get(k) ?? []), e]);
  }

  return (
    <>
      <PageHero title={t.events.title} lead={t.events.lead} image="/wiki/images/gran_via_m_s_concepts.webp" />
      <div className="mx-auto max-w-7xl px-4 py-12" data-wp-slot="events-list">
        <nav aria-label={t.events.filters} className="mb-8 grid gap-3">
          <div className="flex flex-wrap gap-2">
            <Link href={href({ ciudad, tipo })} className={chip(!past)}>{t.events.upcoming}</Link>
            <Link href={href({ ciudad, tipo, pasados: true })} className={chip(past)}>{t.events.past}</Link>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={href({ pasados: past, tipo })} className={chip(!ciudad)}>{t.events.allCities}</Link>
            {cities.map((c) => <Link key={c} href={href({ ciudad: c, tipo, pasados: past })} className={chip(ciudad === c)}>{c}</Link>)}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={href({ ciudad, pasados: past })} className={chip(!tipo)}>{t.events.allTypes}</Link>
            {Object.entries(t.events.kinds).map(([k, l]) => <Link key={k} href={href({ ciudad, tipo: k, pasados: past })} className={chip(tipo === k)}>{l}</Link>)}
          </div>
        </nav>

        {events.length === 0 ? (
          <Pending label={t.common.pendingLabel}>
            {fmt(t.events.none, { when: past ? t.events.whenPast : t.events.whenUpcoming, filters: ciudad || tipo ? t.events.withFilters : "" })}
          </Pending>
        ) : (
          [...byMonth].map(([month, list]) => (
            <section key={month} className="mb-10">
              <h2 className="font-display text-2xl capitalize text-gold">{month}</h2>
              <ul className="mt-4 divide-y divide-gold/10 border border-gold/20 bg-coal">
                {list.map((e) => (
                  <li key={e.id}>
                    <Link href={`/${locale}/eventos/${e.slug}`} className="grid gap-1 p-4 hover:bg-gold/5 sm:grid-cols-[8rem_1fr_auto] sm:items-center">
                      <time dateTime={e.starts_at} className="font-display text-gold">{new Date(e.starts_at).toLocaleDateString(locale, { day: "numeric", month: "short" })}</time>
                      <span>{e.title}<span className="block text-xs text-stone">{[e.organizer, e.city].filter(Boolean).join(" · ")}</span></span>
                      <span className="font-display text-sm text-ice">{t.events.kinds[e.kind]}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </>
  );
}
