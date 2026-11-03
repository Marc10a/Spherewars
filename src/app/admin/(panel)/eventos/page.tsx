import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getStaff, canWrite, type Status } from "@/lib/auth";
import { Flash, StatusBadge } from "@/components/admin";

export default async function Events({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const staff = await getStaff();
  const sb = await supabaseServer();
  const { data } = await sb.from("events").select("id, title, starts_at, city, status").order("starts_at", { ascending: false });
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-gold">SphereEvents</h1>
        {staff && canWrite(staff.role) && <Link href="/admin/eventos/nuevo" className="bg-gold px-4 py-2 text-xs font-semibold uppercase tracking-widest text-abyss">Nuevo</Link>}
      </div>
      <div className="mt-6"><Flash error={error} /></div>
      <ul className="divide-y divide-gold/10 border border-gold/20 bg-coal">
        {(data ?? []).length === 0 && <li className="p-5 text-sm text-stone">Sin eventos todavía.</li>}
        {(data ?? []).map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-4 p-4">
            <Link href={`/admin/eventos/${e.id}`} className="hover:text-gold">{e.title} <span className="text-xs text-stone">{new Date(e.starts_at).toLocaleDateString("es-ES")}{e.city ? ` · ${e.city}` : ""}</span></Link>
            <StatusBadge status={e.status as Status} />
          </li>
        ))}
      </ul>
    </>
  );
}
