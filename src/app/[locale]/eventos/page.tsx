import { oneParam } from "@/lib/params";
import { staticMeta } from "@/lib/seo";
import { notFound } from "next/navigation";
import { dict, isLocale } from "@/lib/i18n";
import { listEvents, type EventRow } from "@/lib/data";
import { wpAgenda } from "@/lib/cms";
import { cmsImageUrl } from "@/lib/cms/images";
import { toAgendaItem } from "@/lib/cms/map";
import campaign from "@/content/events-campaign.json";
import { EventsAgenda, type AgendaDates, type AgendaItem } from "@/components/EventsAgenda";

export const generateMetadata = staticMeta({ title: (t) => t.events.title, description: (t) => t.events.lead, path: "/eventos" });

export default async function Page({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ ciudad?: string | string[]; tipo?: string | string[]; pasados?: string | string[] }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const [ciudad, tipo, pasados] = [oneParam(query.ciudad), oneParam(query.tipo), oneParam(query.pasados)];
  const href = (slug: string) => `/${locale}/eventos/${slug}`;

  // WordPress (Eventos web > Campaña del mes) when it is set up and answers; otherwise the built-in campaign plus any database events.
  const wp = await wpAgenda();
  let month: string, video: string | null, poster: string | null, list: AgendaItem[];
  if (wp) {
    ({ month, video, poster } = wp);
    list = wp.events.map((e) => toAgendaItem(e, { slots: dict.es.events.slots, media: cmsImageUrl, href }));
  } else {
    const [upcoming, past] = await Promise.all([listEvents(), listEvents({ past: true })]);
    const fromCms = (e: EventRow): AgendaItem => ({ id: e.id, date: e.starts_at.slice(0, 10), venue: e.title, city: e.city, kind: e.kind, note: e.organizer, href: href(e.slug) });
    ({ month, video, poster } = campaign);
    list = [...(campaign.events as AgendaItem[]), ...[...upcoming, ...past].map(fromCms)];
  }
  const items = list.sort((a, b) => a.date.localeCompare(b.date));
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" });

  const format = (d: string, o: Intl.DateTimeFormatOptions) => new Date(`${d}T12:00:00Z`).toLocaleDateString(locale, { ...o, timeZone: "UTC" });
  const rawMonth = format(`${month}-15`, { month: "long", year: "numeric" });
  const dates: AgendaDates = {
    monthName: rawMonth.charAt(0).toUpperCase() + rawMonth.slice(1),
    weekdays: Array.from({ length: 7 }, (_, i) => format(`2024-01-0${i + 1}`, { weekday: "short" }).replace(".", "")),
    days: Object.fromEntries(items.map((i) => [i.date, { long: format(i.date, { weekday: "long", day: "numeric", month: "long" }) }])),
  };

  return (
    <EventsAgenda
      locale={locale} items={items} today={today} month={month} video={video} poster={poster}
      initial={{ city: ciudad, kind: tipo, past: pasados === "1" }} dates={dates}
    />
  );
}
