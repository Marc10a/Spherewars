// The data contract between WordPress (namespace /wp-json/sphere/v1; events and campaign: plugin "SphereWars Contenido") and this website.
// WordPress returns ONLY published content here (drafts need the preview token). Everything is validated with zod, so a
// malformed or tampered response can never reach the pages: it is rejected and the site falls back to its static content.
import { z } from "zod";

const iso = z.string().refine((s) => !Number.isNaN(Date.parse(s)), "invalid date");
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
// https only: a plain .url() also accepts javascript:/data: URLs, which must never reach an <a href> or <img src>.
const httpsUrl = z.string().url().refine((u) => u.startsWith("https://"), "https only");
const img = z.object({ url: httpsUrl, alt: z.string().max(300).default("") }).nullable();
const seo = z.object({ title: z.string().max(200).nullable().default(null), description: z.string().max(400).nullable().default(null) }).default({ title: null, description: null });

export const newsItem = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  slug,
  title: z.string().min(1).max(300),
  category: z.string().max(60).default(""),
  published_at: iso.nullable(),
  excerpt: z.string().max(600).default(""),
  content_html: z.string().max(200_000).default(""), // already passed through wp_kses_post by the plugin; sanitised again here
  image: img.default(null),
  seo,
});
export const newsList = z.object({ items: z.array(newsItem).max(100) });

export const eventItem = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  slug,
  kind: z.enum(["demo", "tournament", "special", "community", "fair"]),
  title: z.string().min(1).max(300),
  starts_at: iso,
  ends_at: iso.nullable().default(null),
  organizer: z.string().max(200).nullable().default(null),
  city: z.string().max(120).nullable().default(null),
  address: z.string().max(300).nullable().default(null),
  format: z.string().max(300).nullable().default(null),
  requirements: z.string().max(1000).nullable().default(null),
  description: z.string().max(20_000).nullable().default(null),
  prizes: z.string().max(1000).nullable().default(null),
  fee_cents: z.number().int().min(0).nullable().default(null),
  capacity: z.number().int().min(1).nullable().default(null),
  registration_url: httpsUrl.nullable().default(null),
  image: img.default(null), // the event's poster
  logo: img.default(null),  // the shop's logo
  time_note: z.string().max(200).nullable().default(null), // e.g. «A la apertura de la tienda»; known texts are translated (map.ts)
  seo,
});
export const eventList = z.object({ items: z.array(eventItem).max(200) });

// The month's campaign of the events page (plugin "SphereWars Contenido", Eventos web > Campaña del mes). No month = not set up yet.
export const campaign = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  video: z.object({ url: httpsUrl }).nullable().default(null),
  poster: img.default(null),
});

// Miniatures featured on the home (slugs of wiki character pages) — chosen in WordPress, no code change needed.
export const featuredMinis = z.object({ slugs: z.array(z.string().regex(/^personajes\/[a-z0-9-]+\/[a-z0-9-]+$/)).max(24) });

export type NewsItem = z.infer<typeof newsItem>;
export type EventItem = z.infer<typeof eventItem>;
export type Campaign = z.infer<typeof campaign>;
