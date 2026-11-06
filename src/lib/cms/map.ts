// Pure mapping from the WordPress contract to the shapes the pages already use (no framework imports; unit tested).
import type { EventItem, NewsItem } from "./contract";
import type { AgendaItem } from "@/components/EventsAgenda";

export function toNewsRow(n: NewsItem) {
  return {
    id: n.id, slug: n.slug, category: n.category, title: n.title, publish_at: n.published_at,
    body: { html: n.content_html, md: undefined as string | undefined },
    excerpt: n.excerpt, image: n.image, seo: n.seo,
  };
}

export function toEventRow(e: EventItem) {
  return {
    id: e.id, slug: e.slug, kind: e.kind, title: e.title, starts_at: e.starts_at, ends_at: e.ends_at, organizer: e.organizer,
    city: e.city, address: e.address, format: e.format, requirements: e.requirements, description: e.description, prizes: e.prizes,
    fee_cents: e.fee_cents, capacity: e.capacity, registration_url: e.registration_url, time_note: e.time_note,
    registration_open: false, // WordPress events link to an external registration; in-site sign-ups stay on the database events
  };
}

/** The slot key of a time note written in WordPress, when it is one of the known Spanish texts (then the web shows it translated). */
export function slotKey(note: string | null | undefined, slots: Record<string, string>): string | undefined {
  const n = note?.trim().toLocaleLowerCase("es");
  return n ? Object.keys(slots).find((k) => slots[k].toLocaleLowerCase("es") === n) : undefined;
}

/**
 * One WordPress event date as an agenda card. `media` keeps only files hosted on WordPress (anything else is dropped).
 * Only events with something more to say (description, address, sign-up link) link to their own page.
 */
export function toAgendaItem(e: EventItem, o: { slots: Record<string, string>; media: (url: string | null | undefined) => string | undefined; href: (slug: string) => string }): AgendaItem {
  const slot = slotKey(e.time_note, o.slots);
  return {
    id: e.id, date: e.starts_at.slice(0, 10), venue: e.title, city: e.city, kind: e.kind,
    ...(slot ? { slot } : { note: e.time_note }),
    still: o.media(e.image?.url), logo: o.media(e.logo?.url), address: e.address,
    href: e.description || e.address || e.registration_url ? o.href(e.slug) : undefined,
  };
}
