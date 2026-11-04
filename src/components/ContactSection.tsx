import { dict, type Locale } from "@/lib/i18n";
import { links } from "@/content/site";
import { contactChannels, publicContactEmail } from "@/lib/contact-config";
import { Button } from "@/components/ui";
import { ContactForm } from "@/components/ContactForm";

/** Contact block of the Community page. Shows only real data: nothing is invented. */
export function ContactSection({ locale }: { locale: Locale }) {
  const t = dict[locale];
  const c = t.contact;
  const ch = contactChannels();
  const ready = ch.email || ch.database;
  const email = publicContactEmail();

  return (
    <section id="contacto" data-reveal className="mx-auto max-w-7xl px-4 py-14 md:py-20">
      <h2 className="font-display text-3xl tracking-wide text-ivory md:text-5xl">{c.title}</h2>
      <p className="mt-3 max-w-2xl text-stone">{c.lead}</p>
      <hr className="rune-divider my-8" />

      <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-6">
          {email && (
            <p>
              <span className="block font-display text-sm text-gold">{c.email}</span>
              <a href={`mailto:${email}`} className="text-lg hover:text-gold">{email}</a>
            </p>
          )}
          <div>
            <span className="mb-3 block font-display text-sm text-gold">{c.social}</span>
            <div className="flex flex-wrap gap-3">
              <Button href={links.discord} external>{c.discord}</Button>
              <Button href={links.instagram} variant="ghost" external>Instagram</Button>
              <Button href={links.youtube} variant="ghost" external>YouTube</Button>
            </div>
          </div>
          <p className="max-w-sm text-sm text-stone">{t.home.communityText}</p>
        </div>

        <div>
          {ready ? (
            <ContactForm locale={locale} t={c} turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />
          ) : (
            <p role="note" className="border border-dashed border-gold/40 bg-coal/60 p-5 text-sm text-stone">{c.notReady}</p>
          )}
        </div>
      </div>
    </section>
  );
}
