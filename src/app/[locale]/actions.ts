"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { isLocale } from "@/lib/i18n";

const schema = z.object({
  event_id: z.string().uuid(),
  slug: z.string().max(120),
  locale: z.string(),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  website: z.string().max(0).optional(), // honeypot: bots fill it
});

/**
 * Public event registration. Capacity is enforced by the DB trigger (race-safe),
 * and RLS only allows inserts for published events with registration_open.
 * TODO before launch: add IP rate limiting at the edge (Vercel WAF / Upstash).
 */
export async function registerForEvent(formData: FormData) {
  const p = schema.safeParse(Object.fromEntries(formData));
  if (!p.success) redirect("/");
  const { event_id, slug, locale, name, email } = p.data;
  const base = `/${isLocale(locale) ? locale : "es"}/eventos/${slug}`;
  if (p.data.website) redirect(`${base}?reg=ok`); // silently drop bots

  const sb = await supabaseServer();
  const { error } = await sb.from("event_registrations").insert({ event_id, name, email });
  if (!error) redirect(`${base}?reg=ok`);
  if (error!.message.includes("event full")) redirect(`${base}?reg=full`);
  if (error!.code === "23505") redirect(`${base}?reg=dup`);
  redirect(`${base}?reg=error`);
}
