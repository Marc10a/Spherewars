import { notFound } from "next/navigation";
import { staticMeta } from "@/lib/seo";
import { dict, isLocale } from "@/lib/i18n";
import { formatBytes, listDownloads, mediaUrl } from "@/lib/data";
import Image from "next/image";
import official from "@/content/official-files.json";
import { Button, PageHero } from "@/components/ui";

type OfficialFile = { id: string; title: string; file: string; size: string; type: string; preview: string | null; w?: number; h?: number };

export const generateMetadata = staticMeta({ title: (t) => t.downloads.title, description: (t) => t.downloads.lead, path: "/descargas" });

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dict[locale];
  const items = await listDownloads();

  return (
    <>
      <PageHero title={t.downloads.title} lead={t.downloads.lead} image="/wiki/images/mapa_saphir_2026.webp" />
      <div className="mx-auto max-w-7xl space-y-12 px-4 py-12">
        {([["rulesFiles", official.rules], ["guides", official.guides], ["posters", official.posters], ["maps", official.maps]] as ["rulesFiles" | "guides" | "posters" | "maps", OfficialFile[]][]).map(([key, list]) => (
          <section key={key}>
            <h2 className="font-display text-2xl text-gold">{t.downloads[key]}</h2>
            <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((f) => (
                <li key={f.id} className="flex flex-col border border-gold/20 bg-coal">
                  {f.preview && f.w && f.h ? (
                    <a href={f.file} className="relative block bg-abyss" aria-label={f.title}><Image src={f.preview} alt={f.title} width={f.w} height={f.h} loading="lazy" sizes="(min-width:1024px) 30vw, (min-width:640px) 45vw, 100vw" className="h-64 w-full object-contain" /></a>
                  ) : (
                    <a href={f.file} className="grid h-40 place-items-center bg-abyss font-display text-4xl text-gold/70" aria-label={f.title}>{f.type}</a>
                  )}
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <p lang="es" className="font-medium">{f.title}</p>
                    <p className="text-sm text-stone">{f.type}, {f.size}</p>
                    <div className="mt-auto"><a href={f.file} download className="btn btn-solid inline-flex min-h-12 items-center bg-gold px-6 py-3 font-display text-base tracking-[0.03em] text-abyss hover:bg-ivory">{t.downloads.download}</a></div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {Object.entries(t.downloads.categories).map(([key, label]) => {
          const list = items.filter((i) => i.category === key);
          if (!list.length) return null;
          return (
            <section key={key}>
              <h2 className="font-display text-2xl text-gold">{label}</h2>
              <ul className="mt-4 divide-y divide-gold/10 border border-gold/20 bg-coal">
                {list.map((d) => (
                  <li key={d.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div>
                      <p className="font-medium">{d.name}</p>
                      {d.description && <p className="text-sm text-stone">{d.description}</p>}
                      <p className="mt-1 text-xs text-stone">
                        {[d.version && `v${d.version}`, d.locale?.toUpperCase(), d.file_type?.toUpperCase(), formatBytes(d.size_bytes), `${t.common.updated} ${new Date(d.updated_at).toLocaleDateString(locale)}`].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <Button href={mediaUrl(d.storage_path)!} external>{t.downloads.download}</Button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
