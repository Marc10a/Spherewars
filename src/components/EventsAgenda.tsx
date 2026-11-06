"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, MapPin, Pause, Play, Volume2, VolumeX, X } from "lucide-react";
import { dict, fmt, type Locale } from "@/lib/i18n";
import { Button, chipCls, Pending } from "@/components/ui";
import { ElementCanvas } from "@/components/ElementCanvas";
import { muteForAutoplay, playWithTouchFallback } from "@/lib/video";

export type AgendaItem = { id: string; date: string; venue: string; city: string | null; kind: string; slot?: string; note?: string | null; still?: string; logo?: string; address?: string | null; href?: string };
/** Date text is formatted once on the server: browsers and Node do not format every locale alike. */
export type AgendaDates = { monthName: string; weekdays: string[]; days: Record<string, { long: string }> };
type Filters = { city?: string; kind?: string; past: boolean };

const TONES = ["gold", "ice", "ember"];
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

/** Monday-first cells of a "YYYY-MM" month: null pads the first week. */
function monthCells(month: string) {
  const [y, m] = month.split("-").map(Number);
  const pad = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const total = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return [...Array(pad).fill(null), ...Array.from({ length: total }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)] as (string | null)[];
}

/** Native select: the phone opens its own picker, and the long city list stays out of the way. */
function FilterSelect({ label, value, options, onChange }: { label: string; value?: string; options: string[][]; onChange: (v: string | undefined) => void }) {
  return (
    <label className="relative block min-w-0">
      <span className="sr-only">{label}</span>
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value || undefined)} className={`min-h-11 w-full appearance-none truncate border bg-coal py-2 pl-3 pr-9 font-display text-base ${value ? "border-gold text-gold" : "border-gold/50 text-ivory"}`}>
        <option value="">{label}</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <ChevronDown size={18} aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gold" />
    </label>
  );
}

/** The month's promo video, in the page header: it plays only while on screen. */
function PromoVideo({ src, poster, label, soundOn, soundOff, pause, play }: { src: string; poster?: string; label: string; soundOn: string; soundOff: string; pause: string; play: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const userPaused = useRef(false);
  const [state, setState] = useState<"paused" | "playing">("paused");
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    muteForAutoplay(v);
    const saver = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (saver || window.matchMedia("(prefers-reduced-motion: reduce)").matches) userPaused.current = true;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) v.pause();
      else if (!userPaused.current) playWithTouchFallback(v, () => !userPaused.current);
    }, { threshold: 0.25 });
    io.observe(v);
    return () => io.disconnect();
  }, []);

  const togglePlay = () => {
    const v = ref.current;
    if (!v) return;
    userPaused.current = !v.paused;
    if (v.paused) v.play().catch(() => undefined);
    else v.pause();
  };
  const toggleSound = () => {
    const v = ref.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (!v.muted && v.paused) { userPaused.current = false; v.play().catch(() => undefined); }
  };
  const ctl = "btn inline-flex h-11 w-11 items-center justify-center border border-gold/70 bg-abyss/80 text-ivory hover:bg-gold hover:text-abyss";

  return (
    <figure className="mx-auto w-full max-w-sm lg:w-[min(24rem,calc((100svh-10rem)*.5625))]">
      <video
        ref={ref} src={src} poster={poster} muted loop playsInline preload="none" aria-label={label}
        onPlaying={() => setState("playing")} onPause={() => setState("paused")}
        className="aspect-[9/16] w-full border border-gold/50 bg-abyss object-cover shadow-[0_0_70px_rgba(200,72,31,.35)]"
      />
      <div className="mt-2 flex justify-end gap-2">
        <button type="button" onClick={toggleSound} aria-label={muted ? soundOn : soundOff} className={ctl}>{muted ? <VolumeX size={18} aria-hidden /> : <Volume2 size={18} aria-hidden />}</button>
        <button type="button" onClick={togglePlay} aria-label={state === "playing" ? pause : play} className={ctl}>{state === "playing" ? <Pause size={18} aria-hidden /> : <Play size={18} aria-hidden />}</button>
      </div>
    </figure>
  );
}

/** Agenda of SphereEvents. Filters live in the URL so a filtered agenda can be shared. */
export function EventsAgenda({ locale, items, today, video, poster, month, initial, dates }: { locale: Locale; items: AgendaItem[]; today: string; month: string; video: string | null; poster: string | null; initial: Filters; dates: AgendaDates }) {
  const t = dict[locale].events;
  const a = dict[locale].a11y;
  const [filters, setFilters] = useState<Filters>(initial);
  const [day, setDay] = useState<string | null>(null);
  const [open, setOpen] = useState<AgendaItem | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const qs = new URLSearchParams();
    if (filters.city) qs.set("ciudad", filters.city);
    if (filters.kind) qs.set("tipo", filters.kind);
    if (filters.past) qs.set("pasados", "1");
    window.history.replaceState(null, "", `${window.location.pathname}${qs.size ? `?${qs}` : ""}`);
  }, [filters]);

  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
  }, [open]);

  const upcoming = useMemo(() => items.filter((i) => i.date >= today), [items, today]);
  const next = upcoming[0] ?? null;
  const cities = useMemo(() => ([...new Set(items.map((i) => i.city).filter(Boolean))] as string[]).sort((x, y) => x.localeCompare(y, "es")), [items]);
  const kinds = useMemo(() => [...new Set(items.map((i) => i.kind))], [items]);
  const inMonth = items.filter((i) => i.date.startsWith(month));
  const monthCities = new Set(inMonth.map((i) => i.city).filter(Boolean)).size;
  const pool = day ? items : filters.past ? items.filter((i) => i.date < today).reverse() : upcoming;
  const visible = pool.filter((i) => (!filters.city || i.city === filters.city) && (!filters.kind || i.kind === filters.kind) && (!day || i.date === day));
  const groups = useMemo(() => {
    const m = new Map<string, AgendaItem[]>();
    for (const i of visible) m.set(i.date, [...(m.get(i.date) ?? []), i]);
    return [...m];
  }, [visible]);

  const until = next ? daysBetween(today, next.date) : 0;
  const untilLabel = until === 0 ? t.todayLabel : until === 1 ? t.tomorrowLabel : fmt(t.inDays, { n: until });
  const slotLabel = (i: AgendaItem) => (i.slot ? (t.slots as Record<string, string>)[i.slot] : i.note || t.kinds[i.kind]);
  // A month without video yet shows its poster in the same frame.
  const videoEl = video ? <PromoVideo src={video} poster={poster ?? undefined} label={t.videoLabel} soundOn={t.soundOn} soundOff={t.soundOff} pause={a.pauseVideo} play={a.playVideo} />
    : poster ? <figure className="mx-auto w-full max-w-sm lg:w-[min(24rem,calc((100svh-10rem)*.5625))]"><Image src={poster} alt="" width={576} height={1024} className="aspect-[9/16] w-full border border-gold/50 bg-abyss object-cover shadow-[0_0_70px_rgba(200,72,31,.35)]" /></figure>
    : null;

  return (
    <div className="relative isolate flex flex-col">
      <div className="absolute inset-x-0 top-0 -z-10 h-[52rem] overflow-hidden [mask-image:linear-gradient(black_65%,transparent)]" aria-hidden>
        {poster && <Image src={poster} alt="" fill priority sizes="100vw" className="scale-110 object-cover opacity-30 blur-2xl" />}
        <div className="absolute inset-0 bg-gradient-to-b from-abyss/40 to-abyss" />
        <ElementCanvas element="fire" density={0.3} />
      </div>

      {/* On phones the agenda comes first and the video after it. */}
      <div className="order-1 mx-auto w-full max-w-7xl px-4 max-lg:contents lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-12 lg:py-10">
        <header className="order-1 px-4 pb-8 pt-10 lg:px-0 lg:py-0">
          <h1 className="land-name font-display">{t.title}</h1>
          <p className="mt-2 font-display text-3xl text-gold md:text-4xl">{dates.monthName}</p>
          <p className="mt-3 max-w-xl text-lg text-ivory/90">{t.tagline}</p>
          <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
            <div><dd className="font-display text-5xl text-gold">{inMonth.length}</dd><dt className="mt-1 text-ivory/90">{t.eventsLabel}</dt></div>
            <div><dd className="font-display text-5xl text-gold">{monthCities}</dd><dt className="mt-1 text-ivory/90">{t.citiesLabel}</dt></div>
          </dl>
          {next && (
            <div className="mt-8 flex max-w-xl items-center gap-4 border border-gold/60 bg-abyss/70 p-4 md:p-5">
              {next.logo && <Image src={next.logo} alt="" width={80} height={80} className="h-16 w-16 shrink-0 bg-abyss md:h-20 md:w-20" />}
              <p className="min-w-0">
                <span className="block font-display text-lg text-gold">{t.nextLabel} · {untilLabel}</span>
                <span lang="es" className="mt-1 block font-display text-2xl leading-tight md:text-3xl">{next.venue}</span>
                <span className="mt-1 block text-ivory/90">{dates.days[next.date].long}{next.city ? ` · ${next.city}` : ""}</span>
              </p>
            </div>
          )}
          <div className="mt-6 hidden lg:block"><Button href="#agenda">{t.agendaCta}</Button></div>
        </header>
        {videoEl && <div className="order-3 px-4 pb-16 lg:px-0 lg:pb-0">{videoEl}</div>}
      </div>

      <section id="agenda" aria-label={t.calendar} className="order-2 mx-auto w-full max-w-7xl px-4 pb-16 pt-4 lg:pt-10" data-wp-slot="events-list">
        <h2 className="font-display text-4xl md:text-5xl">{dates.monthName}</h2>
        <div role="group" aria-label={dates.monthName} className="mt-5 grid grid-cols-7 gap-1 md:gap-2">
          {dates.weekdays.map((w) => <span key={w} aria-hidden className="pb-1 text-center font-display text-base capitalize text-stone md:text-lg">{w}</span>)}
          {monthCells(month).map((d, idx) => {
            if (!d) return <span key={`pad-${idx}`} aria-hidden />;
            const n = Number(d.slice(8));
            const isToday = d === today;
            const list = items.filter((x) => x.date === d);
            const cell = "min-h-14 p-1 sm:min-h-20 md:p-2 lg:min-h-24";
            if (!list.length) return <span key={d} className={`${cell} flex justify-center border font-display text-lg text-stone md:justify-start md:text-xl ${isToday ? "border-ivory text-ivory" : "border-gold/10"}`}>{n}</span>;
            const on = day === d;
            return (
              <button
                key={d} type="button" aria-pressed={on} onClick={() => setDay(on ? null : d)}
                aria-label={`${dates.days[d].long}: ${list.map((x) => `${x.venue}${x.city ? `, ${x.city}` : ""}`).join("; ")}`}
                className={`btn ${cell} flex min-w-0 flex-col items-center border text-left font-display text-xl md:items-stretch ${on ? "border-gold bg-gold text-abyss" : d < today ? "border-gold/25 text-stone hover:border-gold/60" : "ev-day-lit border-ember text-ivory hover:bg-ember/40"} ${isToday && !on ? "outline outline-1 outline-offset-1 outline-ivory" : ""}`}
              >
                <span>{n}</span>
                {/* Phones: one mark per event. From tablet up: the shops by name. */}
                <span aria-hidden className="mt-1 flex gap-1 md:hidden">{list.map((x) => <span key={x.id} className={`h-1.5 w-1.5 rounded-full ${on ? "bg-abyss" : "bg-gold"}`} />)}</span>
                <span aria-hidden className="mt-1 hidden min-w-0 md:block">
                  {list.map((x) => <span key={x.id} lang="es" className={`block truncate font-sans text-sm leading-snug ${on ? "text-abyss" : "text-ivory/90"}`}>{x.venue}</span>)}
                </span>
              </button>
            );
          })}
        </div>

        <div role="group" aria-label={t.filters} className="mt-4 grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="grid grid-cols-2">
            <button type="button" aria-pressed={!filters.past && !day} onClick={() => { setDay(null); setFilters({ ...filters, past: false }); }} className={chipCls(!filters.past && !day)}><span className="w-full text-center">{t.upcoming}</span></button>
            <button type="button" aria-pressed={filters.past && !day} onClick={() => { setDay(null); setFilters({ ...filters, past: true }); }} className={`${chipCls(filters.past && !day)} -ml-px`}><span className="w-full text-center">{t.past}</span></button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:contents">
            <FilterSelect label={t.allCities} value={filters.city} options={cities.map((c) => [c, c])} onChange={(city) => setFilters({ ...filters, city })} />
            <FilterSelect label={t.allTypes} value={filters.kind} options={kinds.map((k) => [k, t.kinds[k]])} onChange={(kind) => setFilters({ ...filters, kind })} />
          </div>
        </div>
        <div className="mt-3 flex min-h-11 flex-wrap items-center justify-between gap-x-4">
          <p role="status" className="text-lg text-ivory/90">{visible.length} {visible.length === 1 ? t.eventLabel : t.eventsLabel}</p>
          {(filters.city || filters.kind || day) && <button type="button" onClick={() => { setDay(null); setFilters({ past: filters.past }); }} className="min-h-11 font-display text-lg text-gold underline underline-offset-4">{t.clearFilters}</button>}
        </div>

        {visible.length === 0 ? (
          <div className="mt-4">
            <Pending label={dict[locale].common.pendingLabel}>
              {fmt(t.none, { when: filters.past ? t.whenPast : t.whenUpcoming, filters: filters.city || filters.kind || day ? t.withFilters : "" })}
            </Pending>
          </div>
        ) : (
          <div className="mt-6 grid gap-10">
            {groups.map(([d, list]) => (
              <section key={d} aria-label={dates.days[d].long}>
                <h2 className={`font-display text-3xl first-letter:uppercase ${d < today ? "text-stone" : "text-gold"}`}>{dates.days[d].long}</h2>
                <ul className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {list.map((i, idx) => (
                    <li key={i.id} data-tone={TONES[idx % 3]} className={`ev-card flex gap-4 p-4 ${i.date < today ? "ev-past" : ""}`}>
                      {i.logo && <Image src={i.logo} alt="" width={96} height={96} loading="lazy" className="h-20 w-20 shrink-0 self-start bg-abyss sm:h-24 sm:w-24" />}
                      <div className="min-w-0 flex-1">
                        <h3 lang="es" className="font-display text-2xl leading-tight">{i.href ? <Link href={i.href} className="hover:text-gold">{i.venue}</Link> : i.venue}</h3>
                        {i.city && <p className="font-display text-lg text-gold">{i.city}</p>}
                        <p className="text-ivory/90">{slotLabel(i)}</p>
                        <div className="mt-1 flex flex-wrap gap-x-4">
                          {i.still && <button type="button" onClick={() => setOpen(i)} className="min-h-11 font-display text-lg text-ivory underline underline-offset-4 hover:text-gold">{t.showPoster}</button>}
                          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([i.venue, i.address, i.city].filter(Boolean).join(", "))}`} rel="noopener" className="inline-flex min-h-11 items-center gap-1 font-display text-lg text-ivory underline underline-offset-4 hover:text-gold"><MapPin size={16} aria-hidden />{t.map}</a>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
        <p className="mt-6 text-stone">{t.hoursNote}</p>
      </section>

      <dialog ref={dialog} className="ev-poster" aria-label={open ? `${t.showPoster}: ${open.venue}` : t.showPoster} onClose={() => setOpen(null)} onClick={(e) => { if (e.target === dialog.current) dialog.current?.close(); }}>
        {open?.still && (
          <div className="relative">
            <Image src={open.still} alt={`${open.venue}. ${dates.days[open.date].long}${open.city ? `, ${open.city}` : ""}. ${slotLabel(open)}.`} width={576} height={1024} className="h-auto max-h-[100svh] w-auto" />
            <button type="button" autoFocus onClick={() => dialog.current?.close()} aria-label={t.closePoster} className="btn absolute right-2 top-2 inline-flex h-11 w-11 items-center justify-center border border-gold bg-abyss/90 text-ivory hover:bg-gold hover:text-abyss"><X size={20} aria-hidden /></button>
          </div>
        )}
      </dialog>
    </div>
  );
}
