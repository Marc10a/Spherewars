// Contact form rules as pure functions (no imports) so they run in the server action AND in unit tests.

export const SUBJECTS = ["general", "shop", "events", "press", "other"] as const;
export type ContactError = "name" | "email" | "message" | "consent" | "spam";
export type ContactInput = { name: string; email: string; subject: (typeof SUBJECTS)[number]; message: string };

export const MIN_FILL_MS = 2500;          // a human needs a few seconds to fill the form; bots submit instantly
export const MAX_FORM_AGE_MS = 6 * 3600e3; // stale forms are rejected
export const RATE_WINDOW_MS = 3600e3;
export const RATE_MAX = 3;                // messages per sender per hour

const clean = (s: unknown, max: number) =>
  String(s ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").replace(/\r\n?/g, "\n").trim().slice(0, max);
const oneLine = (s: unknown, max: number) => clean(s, max).replace(/\s+/g, " ");

const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[A-Za-z]{2,}$/;

export type ContactResult = { ok: true; data: ContactInput } | { ok: false; error: ContactError };

export function validateContact(raw: Record<string, unknown>, nowMs: number): ContactResult {
  // Anti-spam first: honeypot must stay empty, and the form must have been open for a plausible time.
  if (String(raw.website ?? "").length > 0) return { ok: false, error: "spam" };
  const ts = Number(raw.ts);
  if (!Number.isFinite(ts) || nowMs - ts < MIN_FILL_MS || nowMs - ts > MAX_FORM_AGE_MS) return { ok: false, error: "spam" };

  const name = oneLine(raw.name, 100);
  if (name.length < 2) return { ok: false, error: "name" };
  const email = oneLine(raw.email, 200).toLowerCase();
  if (!EMAIL.test(email)) return { ok: false, error: "email" };
  const message = clean(raw.message, 3000);
  if (message.length < 10) return { ok: false, error: "message" };
  if (raw.consent !== "on") return { ok: false, error: "consent" };

  const subject = (SUBJECTS as readonly string[]).includes(String(raw.subject)) ? (String(raw.subject) as ContactInput["subject"]) : "general";
  return { ok: true, data: { name, email, subject, message } };
}

/** True when the sender already used up their quota inside the window. `times` = timestamps of their previous messages. */
export function isRateLimited(times: number[], nowMs: number): boolean {
  return times.filter((t) => nowMs - t < RATE_WINDOW_MS).length >= RATE_MAX;
}
