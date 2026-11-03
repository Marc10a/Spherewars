import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getStaff, canWrite, type Status } from "@/lib/auth";
import { downloadCategories } from "@/lib/data";
import { Flash, StatusBadge } from "@/components/admin";

export default async function Downloads({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const staff = await getStaff();
  const sb = await supabaseServer();
  const { data } = await sb.from("downloadable_resources").select("id, name, category, version, status").order("category").order("name");
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-gold">Descargas</h1>
        {staff && canWrite(staff.role) && <Link href="/admin/descargas/nuevo" className="bg-gold px-4 py-2 text-xs font-semibold uppercase tracking-widest text-abyss">Nueva</Link>}
      </div>
      <div className="mt-6"><Flash error={error} /></div>
      <ul className="divide-y divide-gold/10 border border-gold/20 bg-coal">
        {(data ?? []).length === 0 && <li className="p-5 text-sm text-stone">Sin documentos todavía.</li>}
        {(data ?? []).map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-4 p-4">
            <Link href={`/admin/descargas/${d.id}`} className="hover:text-gold">{d.name} <span className="text-xs text-stone">{downloadCategories[d.category]}{d.version ? ` · v${d.version}` : ""}</span></Link>
            <StatusBadge status={d.status as Status} />
          </li>
        ))}
      </ul>
    </>
  );
}
