"use client";

import Link from "next/link";
import Script from "next/script";
import { useActionState } from "react";
import { sendContact, type ContactState } from "@/app/[locale]/contact-actions";
import { SUBJECTS } from "@/lib/contact";
import type { Dict, Locale } from "@/lib/i18n";

const field = "w-full border border-gold/40 bg-abyss px-3 py-2.5 text-ivory placeholder:text-stone/60";

export function ContactForm({ locale, t, turnstileSiteKey }: { locale: Locale; t: Dict["contact"]; turnstileSiteKey?: string }) {
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContact, { status: "idle" });
  if (state.status === "ok") {
    return <p role="status" className="border border-gold/50 bg-gold/10 p-5 text-lg text-ivory">{t.ok}</p>;
  }

  return (
    // key: the form is re-created after every attempt, so it keeps the values the visitor typed (from state.values) and the timer restarts.
    <form key={state.nonce ?? 0} action={action} className="grid gap-4" noValidate>
      <input type="hidden" name="locale" value={locale} />
      {/* Anti-spam timing: the server rejects forms submitted instantly (bots). Set when the form (re)mounts. */}
      <input type="hidden" name="ts" ref={(el) => { if (el) el.value = String(Date.now()); }} />
      {/* Honeypot: invisible to people, bots fill it. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">{t.name}
          <input name="name" required minLength={2} maxLength={100} autoComplete="name" defaultValue={state.values?.name} className={field} />
        </label>
        <label className="grid gap-1 text-sm">{t.emailField}
          <input name="email" type="email" required maxLength={200} autoComplete="email" defaultValue={state.values?.email} className={field} />
        </label>
      </div>
      <label className="grid gap-1 text-sm">{t.subject}
        <select name="subject" defaultValue={state.values?.subject ?? "general"} className={field}>
          {SUBJECTS.map((s) => <option key={s} value={s}>{t.subjects[s]}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm">{t.message}
        <textarea name="message" required minLength={10} maxLength={3000} rows={5} defaultValue={state.values?.message} className={field} />
      </label>

      <label className="flex items-start gap-2 text-xs text-stone">
        <input type="checkbox" name="consent" required defaultChecked={state.values?.consent} className="mt-0.5" />
        <span>{t.consentPre} <Link href={`/${locale}/legal/privacidad`} className="text-gold underline">{t.privacy}</Link> {t.consentPost}</span>
      </label>

      {turnstileSiteKey && (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="lazyOnload" />
          <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-theme="dark" />
        </>
      )}

      {state.status === "error" && state.error && (
        <p role="alert" className="border border-ember bg-ember/20 p-3 text-sm">{state.error === "notReady" ? t.notReady : t.errors[state.error] ?? t.errors.generic}</p>
      )}

      <button disabled={pending} className="justify-self-start bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-abyss transition hover:bg-ivory disabled:opacity-50">
        {pending ? t.sending : t.send}
      </button>
    </form>
  );
}
