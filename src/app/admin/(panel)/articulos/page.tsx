import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getStaff, canWrite, type Status } from "@/lib/auth";
import { Flash, StatusBadge } from "@/components/admin";

export default async function Articles({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const staff = await getStaff();
  const sb = await supabaseServer();
  const { data } = await sb.from("articles").select("id, title, slug, locale, status, updated_at").order("updated_at", { ascending: false });
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-gold">Artículos WikiSphere</h1>
        {staff && canWrite(staff.role) && <Link href="/admin/articulos/nuevo" className="bg-gold px-4 py-2 text-xs font-semibold uppercase tracking-widest text-abyss">Nuevo</Link>}
      </div>
      <div className="mt-6"><Flash error={error} /></div>
      <ul className="divide-y divide-gold/10 border border-gold/20 bg-coal">
        {(data ?? []).length === 0 && <li className="p-5 text-sm text-stone">Sin artículos todavía.</li>}
        {(data ?? []).map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-4 p-4">
            <Link href={`/admin/articulos/${a.id}`} className="hover:text-gold">{a.title} <span className="text-xs text-stone">/{a.locale}/{a.slug}</span></Link>
            <StatusBadge status={a.status as Status} />
          </li>
        ))}
      </ul>
    </>
  );
}
