// Pure mapping from the WordPress contract to the shapes the pages already use (no framework imports; unit tested).
import type { EventItem, NewsItem } from "./contract";

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
    fee_cents: e.fee_cents, capacity: e.capacity, registration_url: e.registration_url,
    registration_open: false, // WordPress events link to an external registration; in-site sign-ups stay on the database events
  };
}
