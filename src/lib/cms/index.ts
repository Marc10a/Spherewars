import { draftMode } from "next/headers";
import { campaign, eventList, featuredMinis, newsList } from "./contract";
import { cmsImageUrl } from "./images";
import { wpGet, type WpOptions } from "./client";
import { toEventRow, toNewsRow } from "./map";
import type { Locale } from "@/lib/i18n";

/**
 * WordPress (headless) is optional: when WP_API_URL is set the editable content comes from it, otherwise the site keeps using
 * its current sources. Any failure (offline, timeout, invalid data) returns null and the caller falls back, so the public
 * site never depends on WordPress being up.
 */
export const wpEnabled = () => Boolean(process.env.WP_API_URL);

async function opts(): Promise<WpOptions> {
  const preview = await draftMode().then((d) => d.isEnabled).catch(() => false);
  return { baseUrl: process.env.WP_API_URL!, previewToken: preview ? process.env.WP_PREVIEW_TOKEN ?? null : null, revalidate: 300 };
}

export async function wpNews(locale: Locale, limit: number) {
  if (!wpEnabled()) return null;
  const r = await wpGet("news", newsList, await opts(), { lang: locale, limit });
  return r ? r.items.map(toNewsRow) : null;
}

export async function wpNewsItem(locale: Locale, slug: string) {
  if (!wpEnabled()) return null;
  const o = await opts();
  const r = await wpGet("news", newsList, o, { lang: locale, slug, preview: o.previewToken ? 1 : undefined });
  const item = r?.items[0];
  return item ? toNewsRow(item) : null;
}

export async function wpEvents(opt: { past?: boolean; limit?: number } = {}) {
  if (!wpEnabled()) return null;
  const r = await wpGet("events", eventList, await opts(), { when: opt.past ? "past" : "upcoming", limit: opt.limit });
  return r ? r.items.map(toEventRow) : null;
}

export async function wpEvent(slug: string) {
  if (!wpEnabled()) return null;
  const o = await opts();
  const r = await wpGet("events", eventList, o, { slug, preview: o.previewToken ? 1 : undefined });
  return r?.items[0] ? toEventRow(r.items[0]) : null;
}

export async function wpFeaturedSlugs() {
  if (!wpEnabled()) return null;
  const r = await wpGet("featured-minis", featuredMinis, await opts());
  return r ? r.slugs : null;
}

/**
 * The events page from WordPress: the month's campaign and every event date (past and upcoming). null when WordPress is not set up,
 * fails, or has no campaign yet: the page then keeps its built-in campaign (src/content/events-campaign.json).
 * Video and poster are kept only when hosted on WordPress itself.
 */
export async function wpAgenda() {
  if (!wpEnabled()) return null;
  const o = await opts();
  const [c, ev] = await Promise.all([wpGet("campaign", campaign, o), wpGet("events", eventList, o, { when: "all", limit: 200 })]);
  if (!c || !ev) return null;
  return { month: c.month, video: cmsImageUrl(c.video?.url) ?? null, poster: cmsImageUrl(c.poster?.url) ?? null, events: ev.items };
}
