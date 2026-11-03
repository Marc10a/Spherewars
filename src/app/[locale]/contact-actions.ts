"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { dict, isLocale } from "@/lib/i18n";
import { isRateLimited, validateContact, RATE_WINDOW_MS, type ContactError } from "@/lib/contact";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { contactChannels } from "@/lib/contact-config";

export type ContactValues = { name: string; email: string; subject: string; message: string; consent: boolean };
export type ContactState = { status: "idle" | "ok" | "error"; error?: ContactError | "rate" | "generic" | "notReady"; values?: ContactValues; nonce?: number };

// Best-effort limiter when there is no database (per server instance). With the database the limit is global.
const memory = new Map<string, number[]>();

async function verifyTurnstile(token: string, ip: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // not configured: honeypot + timing + rate limit still apply
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    });
    return Boolean(((await r.json()) as { success?: boolean }).success);
  } catch {
    return false;
  }
}

/** Contact form: validates, filters spam, rate-limits per sender, then emails (Resend) and/or stores the message. */
export async function sendContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const raw = Object.fromEntries(formData);
  const loc = String(raw.locale);
  const locale = isLocale(loc) ? loc : "es";
  const now = Date.now();
  // On any error the form keeps what the visitor typed (React would otherwise clear it) and gets a fresh anti-spam timer.
  const values: ContactValues = { name: String(raw.name ?? ""), email: String(raw.email ?? ""), subject: String(raw.subject ?? "general"), message: String(raw.message ?? ""), consent: raw.consent === "on" };
  const fail = (error: NonNullable<ContactState["error"]>): ContactState => ({ status: "error", error, values, nonce: now });

  const v = validateContact(raw, now);
  if (!v.ok) return fail(v.error);

  const ch = contactChannels();
  if (!ch.email && !ch.database) return fail("notReady");

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  if (!(await verifyTurnstile(String(raw["cf-turnstile-response"] ?? ""), ip))) return fail("spam");

  // Only a salted hash of the IP is kept (no raw IP stored).
  const ipHash = createHash("sha256").update(`${ip}|${process.env.CONTACT_SALT ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "sw"}`).digest("hex");
  const sb = ch.database ? supabaseAdmin() : null;

  let recent: number[];
  if (sb) {
    const since = new Date(now - RATE_WINDOW_MS).toISOString();
    const { data } = await sb.from("contact_messages").select("created_at").eq("ip_hash", ipHash).gte("created_at", since);
    recent = (data ?? []).map((r) => new Date(r.created_at).getTime());
  } else {
    recent = (memory.get(ipHash) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  }
  if (isRateLimited(recent, now)) return fail("rate");

  const { name, email, subject, message } = v.data;
  const subjectLabel = dict.es.contact.subjects[subject];
  let delivered = false;

  if (ch.email) {
    try {
      const r = await fetch(process.env.RESEND_API_URL ?? "https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: process.env.CONTACT_FROM_EMAIL, to: [process.env.CONTACT_TO_EMAIL], reply_to: email,
          subject: `[SphereWars] ${subjectLabel} · ${name}`,
          text: `Nombre: ${name}\nCorreo: ${email}\nAsunto: ${subjectLabel}\nIdioma: ${locale}\n\n${message}\n`,
        }),
      });
      delivered = r.ok;
      if (!r.ok) console.error("contact email failed", r.status, await r.text());
    } catch (e) {
      console.error("contact email error", e);
    }
  }
  if (sb) {
    const { error } = await sb.from("contact_messages").insert({ name, email, subject: subjectLabel, message, locale, ip_hash: ipHash });
    if (error) console.error("contact store failed", error.message);
    else delivered = true; // stored: the message is not lost even if the email failed
  }
  if (!delivered) return fail("generic");

  memory.set(ipHash, [...recent, now]);
  return { status: "ok" };
}
