import { oneParam } from "@/lib/params";
import { notFound } from "next/navigation";
import { dict, fmt, isLocale } from "@/lib/i18n";
import { formatPrice, getEvent, isUpcoming, registrationCount } from "@/lib/data";
import { pageMeta } from "@/lib/seo";
import { Button, PageHero } from "@/components/ui";
import { RichText } from "@/components/RichText";
import { registerForEvent } from "../../actions";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const e = await getEvent(slug);
  return pageMeta({ title: e?.title, path: `/eventos/${slug}` }, locale);
}

export default async function Page({ params, searchParams }: { params: Promise<{ locale: string; slug: string }>; searchParams: Promise<{ reg?: string | string[] }> }) {
  const { locale, slug } = await params;
  const reg = oneParam((await searchParams).reg);
  if (!isLocale(locale)) notFound();
  const t = dict[locale].events;
  const e = await getEvent(slug);
  if (!e) notFound();

  const when = new Date(e.starts_at);
  const upcoming = isUpcoming(e.starts_at);
  const taken = e.registration_open ? await registrationCount(e.id) : 0;
  const full = e.capacity != null && taken >= e.capacity;
  const fee = formatPrice(e.fee_cents, "EUR", locale);
  const rows: [string, string | null][] = [
    [t.f.type, t.kinds[e.kind]], [t.f.date, when.toLocaleString(locale, { dateStyle: "full", timeStyle: "short" })],
    [t.f.organizer, e.organizer], [t.f.address, [e.address, e.city].filter(Boolean).join(", ") || null],
    [t.f.format, e.format], [t.f.requirements, e.requirements], [t.f.fee, fee], [t.f.prizes, e.prizes],
    [t.f.spots, e.registration_open && e.capacity != null ? fmt(t.spotsOf, { n: Math.max(0, e.capacity - taken), max: e.capacity }) : null],
  ];

  return (
    <>
      <PageHero title={e.title} lead={t.kinds[e.kind]} />
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 md:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <RichText md={e.description ?? undefined} />
          <dl className="grid gap-3 text-sm">
            {rows.filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="grid grid-cols-[7rem_1fr] gap-2 border-b border-gold/10 pb-2"><dt className="font-display text-sm text-gold">{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
          {e.address && <a className="text-sm text-ice underline" rel="noopener" href={`https://www.openstreetmap.org/search?query=${encodeURIComponent([e.address, e.city].filter(Boolean).join(", "))}`}>{t.map}</a>}
        </div>

        <aside aria-label={t.registration} className="h-fit border border-gold/30 bg-coal p-5">
          <h2 className="font-display text-lg">{t.registration}</h2>
          {reg && <p role="status" className="mt-3 border border-gold/50 p-2 text-sm">{Object.hasOwn(t.reg, reg) ? t.reg[reg] : t.reg.error}</p>}
          {!upcoming ? <p className="mt-3 text-sm text-stone">{t.happened}</p>
            : e.registration_open ? (
              full ? <p className="mt-3 text-sm text-stone">{t.full}</p> : (
                <form action={registerForEvent} className="mt-4 grid gap-3">
                  <input type="hidden" name="event_id" value={e.id} /><input type="hidden" name="slug" value={e.slug} /><input type="hidden" name="locale" value={locale} />
                  <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
                  <label className="grid gap-1 text-sm">{t.name}<input name="name" required minLength={2} className="border border-gold/40 bg-abyss px-3 py-2" /></label>
                  <label className="grid gap-1 text-sm">{t.email}<input name="email" type="email" required className="border border-gold/40 bg-abyss px-3 py-2" /></label>
                  <p className="text-xs text-stone">{t.privacyNote}</p>
                  <button className="bg-gold px-4 py-3 font-display text-sm font-semibold text-abyss">{t.submit}</button>
                </form>
              )
            ) : e.registration_url ? <div className="mt-4"><Button href={e.registration_url} external>{t.externalReg}</Button></div>
              : <p className="mt-3 text-sm text-stone">{t.noOnline}</p>}
        </aside>
      </div>
    </>
  );
}
